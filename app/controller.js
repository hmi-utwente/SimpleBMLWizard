var app = angular.module('remoteControlApp', ['luegg.directives', 'ngAudio']);
window._stream = false;

app.factory('socket', function($rootScope) {
    var socket = new eio.Socket();
    return {
        on: function (eventName, callback) {
          socket.on(eventName, function () {  
            var args = arguments;
            $rootScope.$apply(function () {
              callback.apply(socket, args);
            });
          });
        },
        send: function(data) {
            socket.send(data);
        },
        emit: function (eventName, data, callback) {
          socket.emit(eventName, data, function () {
            var args = arguments;
            $rootScope.$apply(function () {
              if (callback) {
                callback.apply(socket, args);
              }
            });
          })
        }
    };
});

function RemoteCTRL($scope, socket, ngAudio) {
    $scope.glued = true;
    $scope.log = [];
	$scope.dialogEditMode = false;
	
	$scope.dialogJson = {
		"blocks": []
	};

	$scope.agentSay = function(text,id) {
        // TODO: can we set, store & pass the characterId in the interface?
        // ...perhaps get it from URL params?
		var msg = {
          type:"bmlsay",
          content: text,
          id: id
        };
        socket.send(JSON.stringify(msg));
	}
	
	$scope.randomID = function() {
		return (Math.floor(Math.random() * 90000) + 10000)+'';
	}
	
	$scope.toggleEditMode = function() {
		$scope.dialogEditMode = !$scope.dialogEditMode;
	}
	
	$scope.saveDialog = function() {
		$scope.dialogEditMode = false;
		var msg = {
			type:'save_dialog',
			data: JSON.parse(angular.toJson($scope.dialogJson))
		}
        socket.send(JSON.stringify(msg));
	}
	
	$scope.loadDialog = function() {
		$scope.dialogEditMode = false;
		var msg = {
			type:'load_dialog',
			data: {}
		}
        socket.send(JSON.stringify(msg));
		console.log('sent loading request');
	}

    $scope.refresh = function() {
        var msg = {
          type:"refresh"
        };
        socket.send(JSON.stringify(msg));
    }

    socket.on('message', function(data){
      var msg = JSON.parse(data);
      if (msg.type == "refresh") {
        // ...
      } else if (msg.type == "dialog") {
		$scope.dialogJson = msg.dialog;
	  }
    });

    socket.on('close', function(){
    });

    socket.on('open', function(){
      $scope.refresh();
	  $scope.loadDialog();
    });
}

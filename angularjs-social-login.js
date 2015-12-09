"use strict";

var socialLogin = angular.module('socialLogin', []);

socialLogin.run(function($window, $rootScope){
	$rootScope.fbReady = false;
	$rootScope.googleReady = false;
	$rootScope.linkedINReady = false;

	$window.googleSignInCallback = function(authResult){
		if(authResult.status.signed_in && authResult.status.method == "PROMPT"){
			$rootScope.$broadcast('event:google-sign-in-success', authResult);
		}else{
			console.log("User not authorised");
		}
	};

	$rootScope.addLinkedInScript = function(apiKey){
		var lIN, d = document, ref = d.getElementsByTagName('script')[0];
		lIN = d.createElement('script');
		lIN.async = false;
		lIN.src = "//platform.linkedin.com/in.js?async=false";
		
		lIN.onload = function() {
			$rootScope.linkedINReady = true;
		};
		lIN.text = ("api_key: " + apiKey).replace("\"", "");
        ref.parentNode.insertBefore(lIN, ref);
	}

	$rootScope.addFbScript = function(){
		var d = document, fbJs, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
		fbJs = d.createElement('script'); 
		fbJs.id = id; 
		fbJs.async = true;
		fbJs.src = "//connect.facebook.net/en_US/sdk.js";

		fbJs.onload = function() {
			$rootScope.fbReady = true;
        };

		ref.parentNode.insertBefore(fbJs, ref);
	}

	$rootScope.addGoogleScript = function(){
		var d = document, gJs, ref = d.getElementsByTagName('script')[0];
		gJs = d.createElement('script');
		gJs.async = true;
		gJs.src = "https://apis.google.com/js/client:platform.js"

		gJs.onload = function() {
			$rootScope.googleReady = true;
        };

        ref.parentNode.insertBefore(gJs, ref);
	}
});

socialLogin.provider("social", function(){
	var fbKey, googleKey, linkedInKey;
	return {
		setFbKey: function(value){
			fbKey = value;
		},
		setGoogleKey: function(value){
			googleKey = value;
		},
		setLinkedInKey: function(value){
			linkedInKey = value;
		},
		$get: function(){
			return{
				fbKey: fbKey,
				googleKey: googleKey,
				linkedInKey: linkedInKey
			}
		}
	}
});

socialLogin.factory("fbService", function($q){
	return {
		login: function(){
			var deferred = $q.defer();
			FB.login(function(res){
				deferred.resolve(res);
			}, {scope: 'email', auth_type: 'rerequest'});
			return deferred.promise;
		},
		getUserDetails: function(){
			var deferred = $q.defer();
			FB.api('/me', function(res){
				if(!res || res.error){
					deferred.reject('Error occured while fetching user details.');
				}else{
					deferred.resolve(res);
				}
			});
			return deferred.promise;
		}
	}
});

socialLogin.directive("linkedIn", function($rootScope, social){
	return {
		restrict: 'EA',
		scope: {},
		link: function(scope, ele, attr){
			$rootScope.addLinkedInScript(social.linkedInKey);
			$rootScope.$watch('linkedINReady', function(nVal, oVal){
				if(nVal){
					ele.on("click", function(){
						IN.User.authorize(function(){});
					})

					IN.Event.on(IN, "auth", function(){
						IN.API.Raw("/people/~:(id,first-name,last-name,email-address)").result(function(res){
							var userDetails = {name: res.firstName + " " + res.lastName, email: res.emailAddress, uid: res.id, provider: "linkedIN"}
							$rootScope.$broadcast('event:social-sign-in-success', userDetails);
					    });
					})
				}
			})
		}
	}
})

socialLogin.directive("gLogin", function($rootScope, social){
	return {
		restrict: 'EA',
		scope: {},
		replace: true,
		link: function(scope, ele, attr){
			$rootScope.addGoogleScript();
			var params = {
				clientid: social.googleKey,
				cookiepolicy: "single_host_origin",
				scope: 'email',
				callback: "googleSignInCallback"
			};
	        ele.on('click', function(){
	        	gapi.auth.signIn(params);
			});

			scope.$on('event:google-sign-in-success', function(event, authResult){
				gapi.client.load('plus','v1', function(){
					gapi.client.plus.people.get({
						'userId': 'me'
					}).execute(function(res){
						var primaryEmail;
					    for (var i=0; i < res.emails.length; i++) {
					      if (res.emails[i].type === 'account'){
					      	primaryEmail = res.emails[i].value;
					      	break;
					      }
					    }
					    var userDetails = {name: res.displayName, email: primaryEmail, uid: res.id, provider: "google"}
					    $rootScope.$broadcast('event:social-sign-in-success', userDetails);
					});
				});
			});
		}
	}
});

socialLogin.directive("fbLogin", function($rootScope, fbService, $cookieStore, $location, social){
	return {
		restrict: 'A',
		scope: {},
		replace: true,
		link: function(scope, ele, attr){
			$rootScope.addFbScript();
			$rootScope.$watch(function(){return $rootScope.fbReady}, function(nVal, oVal){
				if(nVal){
					FB.init({ 
						appId: social.fbKey,
						status: true, 
						cookie: true, 
						xfbml: true,
						version: 'v2.4'
					});
				}
			});
			
			ele.on('click', function(){
				fbService.login().then(function(res){
					if(res.status == "connected"){
						fbService.getUserDetails().then(function(res){
							var userDetails = {email: res.email, uid: res.id, provider: "facebook"}
							$rootScope.$broadcast('event:social-sign-in-success', userDetails);
						}, function(err){

						})
					}
				}, function(err){

				});
			});
		}
	}
})
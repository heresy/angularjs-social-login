"use strict";

var socialLogin = angular.module('socialLogin', ['ngCookies']);

socialLogin.run(function($window, $rootScope){
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
			$rootScope.$broadcast('event:social-login-linkedIn-loaded', true);
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
			$rootScope.$broadcast('event:social-login-fb-loaded', true);
        };

		ref.parentNode.insertBefore(fbJs, ref);
	}

	$rootScope.addGoogleScript = function(){
		var d = document, gJs, ref = d.getElementsByTagName('script')[0];
		gJs = d.createElement('script');
		gJs.async = true;
		gJs.src = "https://apis.google.com/js/client:platform.js"

		gJs.onload = function() {
			$rootScope.$broadcast('event:social-login-google-loaded', true);
        };

        ref.parentNode.insertBefore(gJs, ref);
	}
});

socialLogin.provider("social", function(){
	var fbKey, fbApiV, googleKey, linkedInKey;
	return {
		setFbKey: function(obj){
			fbKey = obj.appId;
			fbApiV = obj.apiVersion;
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
				linkedInKey: linkedInKey,
				fbApiV: fbApiV
			}
		}
	}
});

socialLogin.factory("socialLoginService", function($cookieStore, $rootScope){
	return {
		logout: function(){
			var provider = $cookieStore.get('_login_provider');
			switch(provider) {
				case "google":
					//its a hack need to find better solution.
					var gElement = document.getElementById("gSignout");
					if (typeof(gElement) != 'undefined' && gElement != null)
					{
					  gElement.remove();
					}
					var d = document, gSignout, ref = d.getElementsByTagName('script')[0];
					gSignout = d.createElement('script');
					gSignout.src = "https://accounts.google.com/Logout";
					gSignout.type = "text/javascript";
					gSignout.id = "gSignout";
					gSignout.onload = function() {
						$cookieStore.remove('_login_provider');
						$rootScope.$broadcast('event:social-sign-out-success', "success");
			        };

			        ref.parentNode.insertBefore(gSignout, ref);
			        break;
				case "linkedIn":
					IN.User.logout(function(){
						$cookieStore.remove('_login_provider');
					 	$rootScope.$broadcast('event:social-sign-out-success', "success");
					}, {});
					break;
				case "facebook":
					FB.logout(function(res){
						$cookieStore.remove('_login_provider');
					 	$rootScope.$broadcast('event:social-sign-out-success', "success");
					});
					break;
			}
		},
		setProviderCookie: function(provider){
			$cookieStore.put('_login_provider', provider);
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
			FB.api('/me?fields=name,email', function(res){
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

socialLogin.directive("linkedIn", function($rootScope, social, socialLoginService){
	return {
		restrict: 'EA',
		scope: {},
		link: function(scope, ele, attr){
			$rootScope.addLinkedInScript(social.linkedInKey);
			$rootScope.$on('event:social-login-linkedIn-loaded', function(event, status){
			    ele.on("click", function(){
					IN.User.authorize(function(){});
				})

				IN.Event.on(IN, "auth", function(){
					IN.API.Raw("/people/~:(id,first-name,last-name,email-address)").result(function(res){
						socialLoginService.setProviderCookie("linkedIn");
						var userDetails = {name: res.firstName + " " + res.lastName, email: res.emailAddress, uid: res.id, provider: "linkedIN"}
						$rootScope.$broadcast('event:social-sign-in-success', userDetails);
				    });
				})
			 });
		}
	}
})

socialLogin.directive("gLogin", function($rootScope, social, socialLoginService){
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
					    socialLoginService.setProviderCookie("google");
					    var userDetails = {name: res.displayName, email: primaryEmail, uid: res.id, provider: "google"}
					    $rootScope.$broadcast('event:social-sign-in-success', userDetails);
					});
				});
			});
		}
	}
});

socialLogin.directive("fbLogin", function($rootScope, fbService, social, socialLoginService){
	return {
		restrict: 'A',
		scope: {},
		replace: true,
		link: function(scope, ele, attr){
			$rootScope.addFbScript();
			$rootScope.$on('event:social-login-fb-loaded', function(event, status){
				FB.init({ 
					appId: social.fbKey,
					status: true, 
					cookie: true, 
					xfbml: true,
					version: social.fbApiV
				});

				ele.on('click', function(){
					fbService.login().then(function(res){
						if(res.status == "connected"){
							fbService.getUserDetails().then(function(user){
								socialLoginService.setProviderCookie("facebook");
								var userDetails = {name: user.name, email: user.email, uid: user.id, provider: "facebook"}
								$rootScope.$broadcast('event:social-sign-in-success', userDetails);
							}, function(err){
								console.log(err);
							})
						}
					}, function(err){
						console.log(err);
					});
				});
			});
			
		}
	}
})

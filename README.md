# AngularJS Social Login (socialLogin)
AngularJS Social Login Module

Supported sites:
- Google
- Facebook
- LinkedIN

## Installation

### via bower

```shell
bower install angularjs-social-login --save
```

### configure installation

Include JS file:

```html
<script src="bower_components/angularjs-social-login/angularjs-social-login.js"></script>
```

Then include `socialLogin` as a dependency for your app:

```javascript
angular.module('myApp', ['socialLogin']);
```

## Configuration

### Example

```javascript
app.config(function(socialProvider){
	socialProvider.setGoogleKey("YOUR GOOGLE CLIENT ID");
  socialProvider.setLinkedInKey("YOUR LINKEDIN CLIENT ID");
  socialProvider.setFbKey("YOUR FACEBOOK APP ID");
});
```

## Usage
There are total three directives for handling Google, Facebook, LinkedIn authentication.
- fbLogin (For Facebook)
- gLogin (For Google)
- linkedIn (For LinkedIn)

### Methods

- `socialProvider.setGoogleKey("YOUR GOOGLE CLIENT ID")`
- `socialProvider.setLinkedInKey("YOUR LINKEDIN CLIENT ID")`
- `socialProvider.setFbKey("YOUR FACEBOOK APP ID")`
- `$rootScope.$on('event:social-sign-in-success', function(event, userDetails){})` (Braodcast event which is triggered after successful authentication)

### Example
```html
<button g-login type="button">Google Login</button>
<button linked-in type="button">LinkedIn Login</button>
<button fb-login type="button">facebook Login</button>
```


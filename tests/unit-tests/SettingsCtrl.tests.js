describe('SettingsCtrl:', function() {
  var controller,
  LogMock,
  settingsMock,
  $scope;

  // Load the App Module as a mock.
  // This will also make all app intern services available per inject()
  beforeEach(module('app'));

  // Disable template caching
  beforeEach(module(function($provide, $urlRouterProvider) {
    $provide.value('$ionicTemplateCache', function(){} );
    $urlRouterProvider.deferIntercept();
  }));

  // Instantiate the Controller and Mocks
  // Using angular-mocks inject() for having all the providers ($...) available!
  beforeEach(inject(function($rootScope, $controller) {

    settingsMock = MockFactory.createNewSettingsMock();
    LogMock = { };

    $scope = $rootScope.$new();
    controller = $controller('SettingsCtrl',{
      '$scope': $scope,
      'Log': LogMock,
      'settings': settingsMock
    });

  }));

  // for easy muting:
  function muteHelper(mute) {
    $scope.settings.mute = mute;
    $scope.muteToggle();
  }

  // for easy volume set:
  function setVolume(vol) {
    $scope.settings.volume = vol;
    $scope.changedVolume();
  }

  describe('Muting', function() {

    it('should set volume to 0', function() {
      muteHelper(true);
      expect($scope.settings.volume).toBe(0);
    });

    it('should restore volume profile', function() {
      $scope.settings.currentVolumeProfile = JSON.stringify($scope.settings.volumeProfiles[1]);
      $scope.changeVolumeProfile();
      var old = $scope.settings.volume;
      muteHelper(true);
      expect($scope.settings.mute).toBe(true);
      muteHelper(false);
      expect($scope.settings.volume).toBe(old);
      expect($scope.settings.currentVolumeProfile).toBe(JSON.stringify($scope.settings.volumeProfiles[1]));
    });

	it('should deselect volume profiles', function() {
		muteHelper(false);
		$scope.settings.currentVolumeProfile = JSON.stringify($scope.settings.volumeProfiles[1]);
		$scope.changeVolumeProfile();
		//when muting now no profile should be selected anymore
		muteHelper(true);
		for(var i = 0; i<$scope.settings.volumeProfiles.length; i++){
			JSON.stringify($scope.settings.volumeProfiles[1])
			expect($scope.settings.currentVolumeProfile).not.toBe(JSON.stringify($scope.settings.volumeProfiles[i]));
		}
	});

	it('should reselect volume profiles', function() {
		muteHelper(false);
		$scope.settings.currentVolumeProfile = JSON.stringify($scope.settings.volumeProfiles[1]);
		$scope.changeVolumeProfile();
		muteHelper(true);
		//when unmuting now the profile should be selected again
		muteHelper(false);
		expect($scope.settings.currentVolumeProfile).toBe(JSON.stringify($scope.settings.volumeProfiles[1]));
	});

    it('should unmute on volumeChange', function() {
      muteHelper(true);
      expect($scope.settings.mute).toBe(true);
      setVolume(55);
      expect($scope.settings.mute).toBe(false);
    });

    it('should restore volume before on unmute', function() {
      setVolume(55);
      expect($scope.settings.volume).toBe(55);
      muteHelper(true);
      expect($scope.settings.mute).toBe(true);
      muteHelper(false);
      expect($scope.settings.mute).toBe(false);
      expect($scope.settings.volume).toBe(55);
    });

  });

  describe('VolumeHardButtons', function() {

    it('should unmute', function(){
      muteHelper(true);
      expect($scope.settings.mute).toBe(true);
      $scope.$emit('volumeupbutton');
      expect($scope.settings.mute).toBe(false);
      muteHelper(true);
      expect($scope.settings.mute).toBe(true);
      $scope.$emit('volumedownbutton');
      expect($scope.settings.mute).toBe(false);
    });

    it('should change the volume in the right direction', function() {
      var old = $scope.settings.volume;
      $scope.$emit('volumeupbutton');
      expect($scope.settings.volume).toBeGreaterThan(old);
      old = $scope.settings.volume;
      $scope.$emit('volumedownbutton');
      expect($scope.settings.volume).toBeLessThan(old);
    });

    it('should be capped', function() {
      setVolume(0);
      $scope.$emit('volumedownbutton');
      expect($scope.settings.volume).toBe(0);

      setVolume(100);
      $scope.$emit('volumeupbutton');
      expect($scope.settings.volume).toBe(100);
    });

  });

});

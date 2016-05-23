angular.module('app.controllers', [])
    // Controller for Tag View
    .controller('TagCtrl', function ($scope, $rootScope, $cordovaBluetoothLE, Log, settings) {
        $scope.devices = {};
        $scope.scanDevice = true;
        $scope.noDevice = true;
        $scope.dev1Connected = false;
        $scope.dev2Connected = false;
        $scope.currentDevice1 = null;
        $scope.currentDevice2 = null;
        $scope.firstScan = true;
        $scope.barometer = { temperatureDev1: "FREEZING HELL", pressureDev1: "Inside of Jupiter",
                             temperatureDev2: "FREEZING HELL", pressureDev2: "Inside of Jupiter" };
        var barometer = {
            service: "F000AA40-0451-4000-B000-000000000000",
            data: "F000AA41-0451-4000-B000-000000000000",
            notification: "F0002902-0451-4000-B000-000000000000",
            configuration: "F000AA42-0451-4000-B000-000000000000",
            period: "F000AA43-0451-4000-B000-000000000000"
        };

        function getLastCon() {
            return localStorage.getItem("lastCon");
        }

        function setLastCon(deviceId) {
            localStorage.setItem("lastCon", deviceId);
        }

        $scope.startScan = function () {
            var params = {
                services: [],
                allowDuplicates: false,
                scanTimeout: settings.settings.scanDuration * 1000
            };

            if (window.cordova) {
                params.scanMode = bluetoothle.SCAN_MODE_LOW_POWER;
                params.matchMode = bluetoothle.MATCH_MODE_STICKY;
                params.matchNum = bluetoothle.MATCH_NUM_ONE_ADVERTISEMENT;
                //params.callbackType = bluetoothle.CALLBACK_TYPE_FIRST_MATCH;
            }

            Log.add("Start Scan : " + JSON.stringify(params));

            $cordovaBluetoothLE.startScan(params).then(function (obj) {
                Log.add("Start Scan Auto Stop : " + JSON.stringify(obj));
                $scope.firstScan = false;
                $scope.scanDevice = false;
            }, function (obj) {
                Log.add("Start Scan Error : " + JSON.stringify(obj));
            }, function (device) {
                Log.add("Start Scan Success : " + JSON.stringify(device));

                if (device.status == "scanStarted") return;

                $scope.noDevice = false;
                $scope.devices[device.address] = device;
                $scope.devices[device.address].services = {};
                console.log(JSON.stringify($scope.devices));

                if (device.address == getLastCon() && $scope.firstScan) {
                    $scope.connect(device);
                    $scope.firstScan = false;
                }
            });
        };

        $scope.connect = function (device) {

            var onConnect = function (obj) {

                if($scope.dev1Connected && $scope.dev2Connected){
                    navigator.notification.alert("Sorry. You cannot connect to more than two devices!", function () {});
                    return;
                }

                Log.add("Connect Success : " + JSON.stringify(obj));
                // Save deviceId as last connected one
                setLastCon(device.address);

                if($scope.dev1Connected == false){
                    $scope.dev1Connected = true;
                    $scope.currentDevice1 = device;
                    $scope.barometer.temperatureDev1 = "FREEZING HELL";
                    $scope.barometer.pressureDev1 = "Inside of Jupiter";
                }else{
                    $scope.dev2Connected = true;
                    $scope.currentDevice2 = device;
                    $scope.barometer.temperatureDev2 = "FREEZING HELL";
                    $scope.barometer.pressureDev2 = "Inside of Jupiter";
                }

                //Subscribe to barometer service
                var params = {
                    address: device.address,
                    service: barometer.service,
                    characteristic: barometer.data,
                    timeout: 5000
                };

                Log.add("Subscribe : " + JSON.stringify(params));

                $cordovaBluetoothLE.subscribe(params).then(function (obj) {
                    Log.add("Subscribe Auto Unsubscribe : " + JSON.stringify(obj));
                }, function (obj) {
                    Log.add("Subscribe Error : " + JSON.stringify(obj));
                }, function (obj) {
                    //Log.add("Subscribe Success : " + JSON.stringify(obj));

                    if (obj.status == "subscribedResult") {
                        //Log.add("Subscribed Result");
                        onBarometerData(obj,device);
                        var bytes = $cordovaBluetoothLE.encodedStringToBytes(obj.value);
                        Log.add("Subscribe Success ASCII (" + bytes.length + "): " + $cordovaBluetoothLE.bytesToString(bytes));
                        Log.add("HEX (" + bytes.length + "): " + $cordovaBluetoothLE.bytesToHex(bytes));
                    } else if (obj.status == "subscribed") {
                        Log.add("Subscribed");
                        //Turn on barometer
                        var barometerConfig = new Uint8Array(1);
                        barometerConfig[0] = 0x01;
                        var params = {
                            address: device.address,
                            service: barometer.service,
                            characteristic: barometer.configuration,
                            value: $cordovaBluetoothLE.bytesToEncodedString(barometerConfig),
                            timeout: 5000
                        };

                        Log.add("Write : " + JSON.stringify(params));

                        $cordovaBluetoothLE.write(params).then(function (obj) {
                            Log.add("Write Success : " + JSON.stringify(obj));
                        }, function (obj) {
                            Log.add("Write Error : " + JSON.stringify(obj));
                        });
                    } else {
                        Log.add("Unexpected Subscribe Status");
                    }
                });


            };
            var params = { address: device.address, timeout: 10000 };

            Log.add("Connect : " + JSON.stringify(params));

            $cordovaBluetoothLE.connect(params).then(null, function (obj) {
                Log.add("Connect Error : " + JSON.stringify(obj));
                $scope.close(params.address); //Best practice is to close on connection error
            }, function () {
                $scope.discover(device.address, onConnect);
            });

        };

        $rootScope.$on("bleEnabledEvent", function () {
            $scope.startScan();
        })

        $scope.refreshSensortags = function () {
            $scope.devices = {};
            $scope.startScan();
            $scope.noDevice = true;
            $scope.scanDevice = true;
        }

        $scope.stopScan = function () {
            $scope.scanDevice = false;
            $scope.firstScan = false;
            $cordovaBluetoothLE.stopScan().then(function (obj) {
                Log.add("Stop Scan Success : " + JSON.stringify(obj));
            }, function (obj) {
                Log.add("Stop Scan Error : " + JSON.stringify(obj));
            });
        }

        $scope.close = function (address) {
            var params = { address: address };

            Log.add("Close : " + JSON.stringify(params));

            $cordovaBluetoothLE.close(params).then(function (obj) {
                Log.add("Close Success : " + JSON.stringify(obj));
            }, function (obj) {
                Log.add("Close Error : " + JSON.stringify(obj));
            });

            var device = $scope.devices[address];
            device.services = {};
        };

        function onBarometerData(obj, device) {
            var a = $cordovaBluetoothLE.encodedStringToBytes(obj.value);

            function sensorBarometerConvert(data) {
                return (data / 100);
            }

            if($scope.currentDevice1.address == device.address){
                $scope.barometer.temperatureDev1 = sensorBarometerConvert(a[0] | (a[1] << 8) | (a[2] << 16)) + "°C";
                $scope.barometer.pressureDev1 = sensorBarometerConvert(a[3] | (a[4] << 8) | (a[5] << 16)) + "hPa";
            }else if ($scope.currentDevice2.address == device.address){
                $scope.barometer.temperatureDev2 = sensorBarometerConvert(a[0] | (a[1] << 8) | (a[2] << 16)) + "°C";
                $scope.barometer.pressureDev2 = sensorBarometerConvert(a[3] | (a[4] << 8) | (a[5] << 16)) + "hPa";
            }else{
                Log.add("onBarometerData: no matching device" + JSON.stringify(device.address));
            }
        }

        $scope.disconnect = function (device) {
            if ($scope.dev1Connected && $scope.currentDevice1.address == device.address){
                $scope.dev1Connected = false;
                $scope.close($scope.currentDevice1.address);
            } else if ($scope.dev2Connected && $scope.currentDevice2.address == device.address){
                $scope.dev2Connected = false;
                $scope.close($scope.currentDevice2.address);
            }
        }

        $scope.isConnected = function (device) {
            if ($scope.dev1Connected && $scope.currentDevice1.address == device.address){
                return true;
            } else if ($scope.dev2Connected && $scope.currentDevice2.address == device.address){
                return true;
            } else {
                return false;
            }
        }
        
        $scope.discover = function (address, afterFunction) {
            var params = {
                address: address,
                timeout: 10000
            };

            Log.add("Discover : " + JSON.stringify(params));

            $cordovaBluetoothLE.discover(params).then(function (obj) {
                Log.add("Discover Success : " + JSON.stringify(obj));

                var device = $scope.devices[obj.address];

                var services = obj.services;

                for (var i = 0; i < services.length; i++) {
                    var service = services[i];

                    addService(service, device);

                    var serviceNew = device.services[service.uuid];

                    var characteristics = service.characteristics;

                    for (var j = 0; j < characteristics.length; j++) {
                        var characteristic = characteristics[j];

                        addCharacteristic(characteristic, serviceNew);

                        var characteristicNew = serviceNew.characteristics[characteristic.uuid];

                        var descriptors = characteristic.descriptors;

                        for (var k = 0; k < descriptors.length; k++) {
                            var descriptor = descriptors[k];

                            addDescriptor(descriptor, characteristicNew);
                        }

                    }
                }
                if (afterFunction != undefined) {
                    afterFunction();
                }
            }, function (obj) {
                Log.add("Discover Error : " + JSON.stringify(obj));
            });
        };
        function addService(service, device) {
            if (device.services[service.uuid] !== undefined) {
                return;
            }
            device.services[service.uuid] = { uuid: service.uuid, characteristics: {} };
        }

        function addCharacteristic(characteristic, service) {
            if (service.characteristics[characteristic.uuid] !== undefined) {
                return;
            }
            service.characteristics[characteristic.uuid] = { uuid: characteristic.uuid, descriptors: {}, properties: characteristic.properties };
        }

        function addDescriptor(descriptor, characteristic) {
            if (characteristic.descriptors[descriptor.uuid] !== undefined) {
                return;
            }
            characteristic.descriptors[descriptor.uuid] = { uuid: descriptor.uuid };
        }

        $scope.firstScan = false;
        if (settings.settings.startReconnect == "true" || settings.settings.startReconnect === true) {
            $scope.firstScan = true;
        }

        $rootScope.$on("bleEnabledEvent", function () {
            $scope.startScan();
        });

    })

    // Controller for Settings
    .controller('SettingsCtrl', function ($scope, Log, settings) {

        // Link the scope settings to the settings service
        $scope.settings = settings.settings;

        // Scope update function is the settings service persist function
        $scope.update = settings.persistSettings;

        $scope.newVolumeProfileName = "";

        $scope.changeVolume = function() {
          $scope.settings.currentVolumeProfile = false;
          $scope.update();
        }

        $scope.addVolumeProfile = function(name) {
          // TODO: no duplicates!
          var newProfile = {name: name, volume: $scope.settings.volume};
          $scope.settings.volumeProfiles.push(newProfile);
          $scope.settings.currentVolumeProfile = newProfile;
          $scope.newVolumeProfileName = "";  // TODO: has no effect!
        }

        $scope.removeVolumeProfile = function(volumeProfile) {  // TODO
          console.log("removing volume profile " + volumeProfile.name);
          $scope.settings.volumeProfiles = $scope.settings.volumeProfiles.filter( function(item) {
            return item.name !== volumeProfile.name;
          });
        }

        $scope.changeVolumeProfile = function() {
          $scope.settings.volume = $scope.settings.currentVolumeProfile.volume;
          $scope.update();
        }
        
        $scope.unmute = function(){
            settings.settings.mute = false;
            //persist settings
            $scope.update();
        };
    
        //called when mute was toggled by pressing the button
        $scope.muteToggle = function(){
            if(settings.settings.mute){
                settings.settings.volBeforeMute = settings.settings.volume;
                settings.settings.volume = parseInt(0);
            }else{
                settings.settings.volume = parseInt(settings.settings.volBeforeMute);
            }
            //persist settings
            $scope.update();
        }
    
        $scope.$on('volumeupbutton', function () {
            $scope.$apply(function () {									// angular doesn't fire $apply on the events so if $broadcast is called outside angular's context, you are going to need to $apply by hand.

                // Update Volume + checks for valid values (0 to 100)
                if(settings.settings.mute){
                    var vol = parseInt(settings.settings.volBeforeMute);
                }else{
                    // parse to Int or otherwise it is not if changed per GUI
                    var vol = parseInt(settings.settings.volume);
                }
                var up = 10;

                // Catch if volume 91 to 100, update to max 100
                if (vol > 90)
                    up = 100 - vol;
                vol = vol + up;

                settings.settings.volume = vol;
                //unmute as the user changed the volume
                $scope.unmute();
                //persist settings
                $scope.update();

            });
        });

        $scope.$on('volumedownbutton', function () {
            $scope.$apply(function () {									// angular doesn't fire $apply on the events so if $broadcast is called outside angular's context, you are going to need to $apply by hand.

                // Update Volume + checks for valid values (0 to 100)
                if(settings.settings.mute){
                    var vol = parseInt(settings.settings.volBeforeMute);
                }else{
                    // parse to Int or otherwise it is not if changed per GUI
                    var vol = parseInt(settings.settings.volume);
                }
                var down = 10;

                // Catch if volume 9 to 0, update to min 0
                if (vol < 10)
                    down = vol;
                vol = vol - down;

                settings.settings.volume = vol;
                //unmute as the user changed the volume
                $scope.unmute();
                //persist settings
                $scope.update();

            });
        });
    });

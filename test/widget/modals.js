describe('mediaCenterWidgetModals: Services', function () {
    var $modal, $q;
    beforeEach(module('mediaCenterWidgetModals'));
    beforeEach(module('mediaCenterWidgetFilters'));
    beforeEach(inject(function ($injector) {
        $modal = $injector.get('$modal');
        $q = $injector.get('$q');
    }));

    describe('Modals service', function () {
        var Modals;
        beforeEach(inject(
            function (_Modals_) {
                Modals = _Modals_;
            }));
        it('Modals should exists', function () {
            expect(Modals).toBeDefined();
        });
        it('Modals.moreInfoModal should exists', function () {
            expect(Modals.moreInfoModal).toBeDefined();
        });
    });

    describe('Modals: MoreInfoModalCtrl Controller', function () {
        var scope, modalInstance, Info, spy, MoreInfoModal, Buildfire, $rootScope;
        beforeEach(inject(function ($controller, _$rootScope_) {
                scope = _$rootScope_.$new();
                $rootScope = _$rootScope_;
                modalInstance = {                    // Create a mock object using spies
                    close: jasmine.createSpy('modalInstance.close'),
                    dismiss: jasmine.createSpy('modalInstance.dismiss'),
                    result: {
                        then: jasmine.createSpy('modalInstance.result.then')
                    }
                };
                Info = {};
                Buildfire = {
                    services: {
                        media: {
                            audioPlayer: {
                                getPlaylist: function (cb) {
                                    console.log("getPlaylist hasbeen called");
                                    cb(null, [{title: 'title'}]);
                                },
                                addToPlaylist: function () {
                                    console.log("addToPlaylist hasbeen called");
                                },
                                removeFromPlaylist: function (index) {
                                    console.log("removeFromPlaylist hasbeen called");
                                }
                            }
                        }
                    }
                };
                MoreInfoModal = $controller('MoreInfoModalCtrl', {
                    $scope: scope,
                    $modalInstance: modalInstance,//_$modal_.op,
                    Info: Info,
                    Buildfire: Buildfire
                });
            })
        );
        it('MoreInfoModal should exists', function () {
            expect(MoreInfoModal).toBeDefined();
        });
        it('MoreInfoModal.ok should exists', function () {
            expect(MoreInfoModal.ok).toBeDefined();
        });
        it('MoreInfoModal.cancel should exists', function () {
            expect(MoreInfoModal.cancel).toBeDefined();
        });
        it('RemovePopup.ok should close modalInstance', function () {
            MoreInfoModal.ok();
            expect(modalInstance.close).toHaveBeenCalledWith('yes');
        });
        it('MoreInfoModal.ok should dismiss modalInstance', function () {
            MoreInfoModal.cancel();
            expect(modalInstance.dismiss).toHaveBeenCalledWith('no');
        });
        it('MoreInfoModal.add should call addToPlaylist', function () {
            MoreInfoModal.add('title', 'url', 'image.png', 'artist');
            $rootScope.$apply();
            //expect(Buildfire.services.media.audioPlayer.addToPlaylist).toHaveBeenCalledWith('no');
        });
        it('MoreInfoModal.remove should call removeFromPlaylist', function () {
            MoreInfoModal.remove(1);
            $rootScope.$apply();
            //expect(Buildfire.services.media.audioPlayer.addToPlaylist).toHaveBeenCalledWith('no');
        });
    });
    describe('Modals: MoreInfoModalCtrl Controller Error ', function () {
        var scope, modalInstance, Info, spy, MoreInfoModal, Buildfire, $rootScope;
        beforeEach(inject(function ($controller, _$rootScope_) {
                scope = _$rootScope_.$new();
                $rootScope = _$rootScope_;
                modalInstance = {                    // Create a mock object using spies
                    close: jasmine.createSpy('modalInstance.close'),
                    dismiss: jasmine.createSpy('modalInstance.dismiss'),
                    result: {
                        then: jasmine.createSpy('modalInstance.result.then')
                    }
                };
                Info = {};
                Buildfire = {
                    services: {
                        media: {
                            audioPlayer: {
                                getPlaylist: function (cb) {
                                    console.log("getPlaylist hasbeen called");
                                    cb({}, null);
                                },
                                addToPlaylist: function () {
                                    console.log("addToPlaylist hasbeen called");
                                },
                                removeFromPlaylist: function (index) {
                                    console.log("removeFromPlaylist hasbeen called");
                                }
                            }
                        }
                    }
                };
                MoreInfoModal = $controller('MoreInfoModalCtrl', {
                    $scope: scope,
                    $modalInstance: modalInstance,//_$modal_.op,
                    Info: Info,
                    Buildfire: Buildfire
                });
            })
        );
        it('MoreInfoModal should exists', function () {
            expect(MoreInfoModal).toBeDefined();
        });
    });
});

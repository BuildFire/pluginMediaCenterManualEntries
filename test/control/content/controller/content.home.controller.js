describe('Unit : Controller - ContentHomeCtrl', function () {

// load the controller's module
    beforeEach(module('mediaCenterContent'));

    var
        ContentHome, scope, Modals, DB, $timeout, COLLECTIONS, Orders, AppConfig, Messaging, EVENTS, PATHS, $csv, $q, Buildfire;

    beforeEach(inject(function ($controller, _$rootScope_, _Modals_, _DB_, _$timeout_, _COLLECTIONS_, _Orders_, _AppConfig_, _Messaging_, _EVENTS_, _PATHS_, _$csv_, _$q_) {
            scope = _$rootScope_.$new();
            Modals = _Modals_;
            DB = _DB_;
            $timeout = _$timeout_;
            COLLECTIONS = _COLLECTIONS_;
            Orders = _Orders_;
            AppConfig = _AppConfig_;
            Messaging = _Messaging_;
            EVENTS = _EVENTS_;
            PATHS = _PATHS_;
            $csv = _$csv_;
            Buildfire = {
                spinner: {
                    show: function () {
                        return true
                    },
                    hide: function () {
                        return true
                    }
                },
                components: {
                    carousel: {
                        editor: {}
                    }
                },
                navigation: {
                    scrollTop:function(){}
                }
            };
            Buildfire.components.carousel = jasmine.createSpyObj('Buildfire.components.carousel', ['editor', '', '']);
            Buildfire.components.carousel.editor.and.callFake(function () {
                return {
                    loadItems: function () {
                        console.log("editor.loadItems hasbeen called");
                    }
                };
            });
            /*Buildfire.navigation = jasmine.createSpyObj('Buildfire.navigation', ['scrollTop', '', '']);
            Buildfire.navigation.scrollTop.and.callFake(function () {
                return {
                    loadItems: function () {
                        console.log("editor.loadItems hasbeen called");
                    }
                };
            });*/
            ContentHome = $controller('ContentHomeCtrl', {
                $scope: scope,
                MediaCenterInfo: {id: '1', data: {content: {sortBy: 'title'}}},
                Modals: Modals,
                DB: DB,
                $timeout: $timeout,
                COLLECTIONS: COLLECTIONS,
                Orders: Orders,
                AppConfig: AppConfig,
                Messaging: Messaging,
                EVENTS: EVENTS,
                PATHS: PATHS,
                $csv: $csv,
                Buildfire: Buildfire
            });
            $q = _$q_;
        })
    )
    ;

    describe('Units: units should be Defined', function () {
        it('it should pass if ContentHome is defined', function () {
            expect(ContentHome).not.toBeUndefined();
        });
        it('it should pass if Modals is defined', function () {
            expect(Modals).not.toBeUndefined();
        });
        it('it should pass if DB is defined', function () {
            expect(DB).not.toBeUndefined();
        });
        it('it should pass if COLLECTIONS is defined', function () {
            expect(COLLECTIONS).not.toBeUndefined();
        });
        it('it should pass if AppConfig is defined', function () {
            expect(AppConfig).not.toBeUndefined();
        });
        it('it should pass if Messaging function is defined', function () {
            expect(Messaging).not.toBeUndefined();
        });
        it('it should pass if EVENTS function is defined', function () {
            expect(EVENTS).not.toBeUndefined();
        });
        it('it should pass if PATHS function is defined', function () {
            expect(PATHS).not.toBeUndefined();
        });
        it('it should pass if ContentHome.info function is defined', function () {
            expect(ContentHome.info).not.toBeUndefined();
        });
        it('it should pass if ContentHome.bodyWYSIWYGOptions is defined', function () {
            expect(ContentHome.bodyWYSIWYGOptions).not.toBeUndefined();
        });
    });

    describe('Unit: ContentHome.removeListItem', function () {
        var spy, removePopupModal;
        beforeEach(inject(function () {




            //Modals=jasmine.createSpyObj('Modals',['removePopupModal']);
            spy = spyOn(Modals, 'removePopupModal').and.callFake(function () {
                var deferred = $q.defer();
                deferred.resolve('Remote call result');
                return deferred.promise;
            });

        }));

        it('it should do nothing if index is invalid', function () {
            ContentHome.items = ['test'];
            ContentHome.removeListItem(-1);
            expect(spy).not.toHaveBeenCalled();
        });

        it('it should work fine if index is valid', function () {
            ContentHome.items = ['test'];
            ContentHome.removeListItem(0);
            expect(spy).toHaveBeenCalled();//With({title:'test'});
            //expect(ContentHome.info.data.content.images.length).toEqual(0);

        });

    });

    describe('Unit: ContentHome.searchListItem', function () {
        var spy, removePopupModal;
        beforeEach(inject(function () {

            spy = spyOn(ContentHome, 'getMore').and.callFake(function () {
            });

        }));

        it('it should call getMore when called', function () {
            ContentHome.searchListItem('');
            expect(spy).toHaveBeenCalled();
        });

    });

    describe('Unit: ContentHome.toggleSortOrder', function () {
        var spy, removePopupModal;
        beforeEach(inject(function () {

            spy = spyOn(ContentHome, 'getMore').and.callFake(function () {
            });

        }));

        it('should be able to call getMore when called with proper arguments', function () {
            ContentHome.toggleSortOrder('Newest');
            expect(spy).toHaveBeenCalled();
        });

        it('should do nothing when arguments is falsy', function () {
            ContentHome.toggleSortOrder('');
            expect(spy).not.toHaveBeenCalled();
        });


    });

    describe('Unit: ContentHome.getMore', function () {
        var spy, removePopupModal, MediaContent = {
            find: function () {
            }
        };
        beforeEach(inject(function () {

            spy = spyOn(MediaContent, 'find').and.callFake(function () {
                var deferred = $q.defer();
                deferred.resolve(['Remote call result']);
                return deferred.promise;
            });

        }));

        /*it('should be able to call MediaContent.find when called with proper arguments', function () {
            ContentHome.isBusy = false;
            ContentHome.getMore();
            expect(spy).toHaveBeenCalled();
        });*/

        it('should do nothing when isBusy(fetching)', function () {
            ContentHome.isBusy = true;
            ContentHome.getMore();
            expect(spy).not.toHaveBeenCalled();
        });

        it('should do nothing when noMore (all data loaded)', function () {
            ContentHome.noMore = false;
            ContentHome.getMore();
            expect(spy).not.toHaveBeenCalled();
        });
    });
});
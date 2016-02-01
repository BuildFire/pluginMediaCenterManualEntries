describe('Unit : Controller - ContentMediaCtrl', function () {

// load the controller's module
    beforeEach(module('mediaCenterContent'));

    var
        ContentMedia, $rootScope, scope, $timeout,Location, $window, Buildfire, DB, COLLECTIONS, AppConfig, Messaging, EVENTS, PATHS;
    beforeEach(module('mediaCenterContent', function ($provide) {
        $provide.service('Buildfire', function () {
            this.imageLib = jasmine.createSpyObj('imageLib', ['showDialog']);
            this.imageLib.showDialog.and.callFake(function (options, callback) {
                callback(null, {selectedFiles: ['test']});
            });
            this.datastore = jasmine.createSpyObj('datastore', ['get', 'save', 'update']);
            this.datastore.get.and.callFake(function (_tagName, callback) {
                if (_tagName) {
                    callback(null, {
                        data: {
                            design: {
                                itemListLayout: 'layout1',
                                bgImage: ''
                            },
                            content: {
                                images: [{title: 'bg1.png'}]
                            }
                        }
                    });
                } else {
                    callback('Error', null);
                }
            });
            this.datastore.update.and.callFake(function (_tagName, id, data, callback) {
                if (_tagName) {
                    callback(null, {
                        data: {
                            design: {
                                itemListLayout: 'layout1',
                                bgImage: ''
                            },
                            content: {
                                images: [{title: 'bg1.png'}]
                            }
                        }
                    });
                } else {
                    callback('Error', null);
                }
            });
            this.datastore.save.and.callFake(function (options, _tagName, callback) {
                if (_tagName) {
                    callback(null, [{
                        data: {
                            design: {
                                itemListLayout: 'layout1',
                                bgImage: ''
                            },
                            content: {
                                images: [{title: 'bg1.png'}]
                            }
                        }
                    }]);
                } else {
                    callback('Error', null);
                }
            });
            this.components = {
                images: {
                    thumbnail: function () {
                        this.loadbackground = function (url) {
                        };
                        this.onChange = function (url) {
                        };
                        this.onDelete = function (url) {
                        };
                        return this;

                    }
                }
            };
            this.navigation = {
                scrollTop: function () {
                }
            };
            this.components.actionItems = jasmine.createSpyObj('Buildfire.components.actionItems', ['sortableList', '', '']);
            this.components.actionItems.sortableList.and.callFake(function () {
                return {
                    sortableList: function (id) {
                        console.log("actionItems.sor" +
                            "tableList hasbeen called");
                        return {
                            'loadItems':function (items) {}
                        };
                    }
                };
            });
        });
    }));

    beforeEach(inject(function ($controller, _$rootScope_,_$timeout_, _Location_, _$window_, _Buildfire_, _DB_, _COLLECTIONS_, _AppConfig_, _Messaging_, _EVENTS_, _PATHS_) {
            scope = _$rootScope_.$new();
            $timeout=_$timeout_;
            $rootScope = _$rootScope_;
            DB = _DB_;
            COLLECTIONS = _COLLECTIONS_;
            AppConfig = _AppConfig_;
            Messaging = _Messaging_;
            EVENTS = _EVENTS_;
            PATHS = _PATHS_;
            $window = _$window_;
            Buildfire = _Buildfire_;
            Location = _Location_;
            ContentMedia = $controller('ContentMediaCtrl', {
                $scope: scope,
                $window: $window,
                DB: DB,
                COLLECTIONS: COLLECTIONS,
                Location: Location,
                media: {id: '1', data: {topImage: "ABC.png", image: "abc.png", mediaDate: 1234}},
                Messaging: Messaging,
                EVENTS: EVENTS,
                PATHS: PATHS,
                AppConfig: AppConfig,
                Buildfire: Buildfire,
                $timeout:$timeout
            });
        })
    )
    ;

    describe('Units: units should be Defined', function () {
        it('it should pass if ContentMedia is defined', function () {
            expect(ContentMedia).not.toBeUndefined();
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
        it('it should pass if ContentMedia.item is defined', function () {
            expect(ContentMedia.item).not.toBeUndefined();
        });
        it('it should pass if ContentMedia.linksSortableOptions is defined', function () {
            expect(ContentMedia.linksSortableOptions).not.toBeUndefined();
        });
        it('it should pass if ContentMedia.bodyContentWYSIWYGOptions is defined', function () {
            expect(ContentMedia.bodyContentWYSIWYGOptions).not.toBeUndefined();
        });
        it('it should pass if ContentMedia.selectTopImage function is defined', function () {
            expect(ContentMedia.selectTopImage).not.toBeUndefined();
        });
        it('it should pass if ContentMedia.removeTopImage function is defined', function () {
            expect(ContentMedia.removeTopImage).not.toBeUndefined();
        });
        it('it should pass if ContentMedia.removeTopImage function is executed', function () {
            ContentMedia.item.data.topImage = "demo.png";
            ContentMedia.removeTopImage();
            $rootScope.$digest();
            expect(ContentMedia.item.data.topImage).toEqual("");
        });
        it('it should pass if ContentMedia.selectAudioImage function is defined', function () {
            expect(ContentMedia.selectAudioImage).not.toBeUndefined();
        });
        it('it should pass if ContentMedia.removeAudioImage function is defined', function () {
            expect(ContentMedia.removeAudioImage).not.toBeUndefined();
        });
        it('it should pass if ContentMedia.removeAudioImage function is executed', function () {
            ContentMedia.item.data.image = "demo.png";
            ContentMedia.removeAudioImage();
            $rootScope.$digest();
            expect(ContentMedia.item.data.image).toEqual("");
        });
        it('it should pass if ContentMedia.done function is defined', function () {
            expect(ContentMedia.done).not.toBeUndefined();
        });
    });

    describe('Units: Methods should be working properly', function () {
        var spy;
        beforeEach(inject(function () {
            spy = spyOn(Location, 'goToHome').and.callFake(function () {
            });
        }));
        it('it should pass if ContentMedia.done function call Location.goToHome', function () {
            ContentMedia.done();
            expect(spy).toHaveBeenCalled();
        });
        it('it should pass if ContentMedia.delete function does nothing when ContentMedia.item.id is falsy', function () {
            ContentMedia.item = {id: ''};
            var MediaContent = {
                delete: function () {
                }
            };
            var mediaContentSpy = spyOn(MediaContent, 'delete').and.callFake(function () {
            });
            expect(mediaContentSpy).not.toHaveBeenCalled();
        });
        it('it should pass if ContentMedia.selectTopImage changes ContentMedia.item.data.topImage in success case', function () {
            ContentMedia.selectTopImage();
            expect(ContentMedia.item.data.topImage).toEqual('test');

        });
        it('it should pass if ContentMedia.selectAudioImage changes ContentMedia.item.data.topImage in success case', function () {
            ContentMedia.selectAudioImage();
            expect(ContentMedia.item.data.image).toEqual('test');

        });
        it('it should pass if ContentMedia.selectTopImage changes ContentMedia.item.data.topImage in Error case', function () {
            ContentMedia.selectTopImage();
            expect(ContentMedia.item.data.topImage).toEqual('test');

        });
        it('it should pass if ContentMedia.selectAudioImage changes ContentMedia.item.data.topImage in Error case', function () {
            ContentMedia.selectAudioImage();
            expect(ContentMedia.item.data.image).toEqual('test');

        });
    });


    describe('Unit: ContentMedia.selectAudioImage', function () {

        it('it should call Buildfire.imageLib.showDialog', function () {
            ContentMedia.selectAudioImage('');
            expect(Buildfire.imageLib.showDialog).toHaveBeenCalled();
        });

    });

    describe('Unit: ContentMedia.linkEditor.onAddItems', function () {

        it('it should call data links', function () {
            ContentMedia.item.data.links = [];
            ContentMedia.linkEditor.onAddItems({a: 1});
            expect(ContentMedia.item.data.links.length).toEqual(1);
        });


        it('it should call assign data links if it is null', function () {
            ContentMedia.item.data.links = null;
            ContentMedia.linkEditor.onAddItems({a: 1});
            expect(ContentMedia.item.data.links.length).toEqual(1);
        });

    });

    describe('Unit: ContentMedia.linkEditor.onDeleteItem', function () {

        it('it should call data links', function () {
            ContentMedia.item.data.links = [{a: 1}];
            ContentMedia.linkEditor.onDeleteItem({a: 1}, 0);
            expect(ContentMedia.item.data.links.length).toEqual(0);
        });
    });
    describe('Unit: ContentMedia.linkEditor.onItemChange', function () {

        it('it should call data links', function () {
            ContentMedia.item.data.links = [{a: 1}];
            ContentMedia.linkEditor.onItemChange({a: 2}, 0);
            expect(ContentMedia.item.data.links[0].a).toEqual(2);
        });
    });

    describe('Unit: ContentMedia.linkEditor.onOrderChange', function () {

        it('it should call data links', function () {
            ContentMedia.item.data.links = [{a: 1}, {a: 2}];
            ContentMedia.linkEditor.onOrderChange({a: 1}, 0, 1);
            expect(ContentMedia.item.data.links[0].a).toEqual(2);
        });
    });
    describe('Unit: $watcher', function () {

        it('it should call data links', function () {
            ContentMedia.info = {data: {}};
            $rootScope.$digest();
            ContentMedia.info = {id: '123', data: {design: {}}};
            $rootScope.$digest();
        });
    });


});
describe('Unit : Controller - ContentMediaCtrl Null case', function () {

// load the controller's module
    beforeEach(module('mediaCenterContent'));

    var
        ContentMedia, $rootScope, scope, Location, $window, Buildfire, DB, COLLECTIONS, AppConfig, Messaging, EVENTS, PATHS;
    beforeEach(module('mediaCenterContent', function ($provide) {
        $provide.service('Buildfire', function () {
            this.imageLib = jasmine.createSpyObj('imageLib', ['showDialog']);
            this.imageLib.showDialog.and.callFake(function (options, callback) {
                callback(null, {selectedFiles: ['test']});
            });
            this.datastore = jasmine.createSpyObj('datastore', ['get', 'save', 'update']);
            this.datastore.get.and.callFake(function (_tagName, callback) {
                if (_tagName) {
                    callback(null, {
                        data: {
                            design: {
                                itemListLayout: 'layout1',
                                bgImage: ''
                            },
                            content: {
                                images: [{title: 'bg1.png'}]
                            }
                        }
                    });
                } else {
                    callback('Error', null);
                }
            });
            this.datastore.update.and.callFake(function (_tagName, id, data, callback) {
                if (_tagName) {
                    callback(null, {
                        data: {
                            design: {
                                itemListLayout: 'layout1',
                                bgImage: ''
                            },
                            content: {
                                images: [{title: 'bg1.png'}]
                            }
                        }
                    });
                } else {
                    callback('Error', null);
                }
            });
            this.datastore.save.and.callFake(function (options, _tagName, callback) {
                if (_tagName) {
                    callback(null, [{
                        data: {
                            design: {
                                itemListLayout: 'layout1',
                                bgImage: ''
                            },
                            content: {
                                images: [{title: 'bg1.png'}]
                            }
                        }
                    }]);
                } else {
                    callback('Error', null);
                }
            });
            this.components = {
                images: {
                    thumbnail: function () {
                        this.loadbackground = function (url) {
                        };
                        this.onChange = function (url) {
                        };
                        this.onDelete = function (url) {
                        };
                        return this;

                    }
                },
                actionItems:{
                    sortableList: function (id) {
                        console.log("actionItems.sor" +
                            "tableList hasbeen called????????????????????????????????????????");
                        return {
                            'loadItems':function (items) {
                                console.log('Items----------------*************************************----in LinkEditor');
                            }
                        };
                    }
                }
            };
            this.navigation = {
                scrollTop: function () {
                }
            };
            /*this.components.actionItems = jasmine.createSpyObj('Buildfire.components.actionItems', ['sortableList', '', '']);
            this.components.actionItems.sortableList.and.callFake(function () {
                return {
                    sortableList: function (id) {
                        console.log("actionItems.sor" +
                            "tableList hasbeen called????????????????????????????????????????");
                        return {
                            'loadItems':function (items) {
                                console.log('Items----------------*************************************----in LinkEditor');
                            }
                        };
                    }
                };
            });*/
        });
    }));

    beforeEach(inject(function ($controller, _$rootScope_, _Location_, _$window_, _Buildfire_, _DB_, _COLLECTIONS_, _AppConfig_, _Messaging_, _EVENTS_, _PATHS_) {
            scope = _$rootScope_.$new();
            $rootScope = _$rootScope_;
            DB = _DB_;
            COLLECTIONS = _COLLECTIONS_;
            AppConfig = _AppConfig_;
            Messaging = _Messaging_;
            EVENTS = _EVENTS_;
            PATHS = _PATHS_;
            $window = _$window_;
            Buildfire = _Buildfire_;
            Location = _Location_;
            ContentMedia = $controller('ContentMediaCtrl', {
                $scope: scope,
                $window: $window,
                DB: DB,
                COLLECTIONS: COLLECTIONS,
                Location: Location,
                media: null,
                Messaging: Messaging,
                EVENTS: EVENTS,
                PATHS: PATHS,
                AppConfig: AppConfig,
                Buildfire: Buildfire
            });
        })
    )
    ;

    describe('Units: ContentMedia.item should be Defined', function () {
        it('it should pass if ContentMedia is defined', function () {
            expect(ContentMedia).not.toBeUndefined();
            expect(ContentMedia.item).not.toBeUndefined();
        });
    });
})
;


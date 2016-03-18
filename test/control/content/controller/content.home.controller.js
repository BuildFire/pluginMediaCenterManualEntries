describe('Unit : Controller - ContentHomeCtrl', function () {

// load the controller's module
    beforeEach(module('mediaCenterContent'));

    var
        ContentHome, scope, Modals, DB, $timeout, COLLECTIONS, Orders, AppConfig, Messaging, EVENTS, PATHS, $csv, $q, Buildfire;
    beforeEach(module('mediaCenterContent', function ($provide) {
        $provide.service('Buildfire', function () {
            this.imageLib = jasmine.createSpyObj('imageLib', ['showDialog']);
            this.imageLib.showDialog.and.callFake(function (options, callback) {
                callback(null, {selectedFiles: ['test']});
            });
            this.datastore = jasmine.createSpyObj('datastore', ['get', 'save', 'update', 'search']);
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
                                images: [{title: 'bg1.png'}],
                                rankOfLastItem: 10
                            }
                        }
                    }]);
                } else {
                    callback('Error', null);
                }
            });
            this.datastore.search.and.callFake(function (options, _tagName, callback) {
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
            this.history = {
                push: function (label, id) {
                },
                onPop: function (data) {
                },
                pop: function () {

                }
            };
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
                carousel: {
                    editor: {}
                }
            };
            this.navigation = {
                scrollTop: function () {
                }
            };
            this.spinner = {
                show: function () {
                    return true
                },
                hide: function () {
                    return true
                }
            };
            this.components.actionItems = jasmine.createSpyObj('Buildfire.components.actionItems', ['sortableList', '', '']);
            this.components.actionItems.sortableList.and.callFake(function () {
                return {
                    sortableList: function (id) {
                        console.log("actionItems.sor" +
                            "tableList hasbeen called");
                        return {
                            'loadItems': function (items) {
                            }
                        };
                    }
                };
            });
            this.components.carousel = jasmine.createSpyObj('Buildfire.components.carousel', ['editor', '', '']);
            this.components.carousel.editor.and.callFake(function () {
                return {
                    loadItems: function () {
                        console.log("editor.loadItems hasbeen called");
                    }
                };
            });
        });
    }));

    beforeEach(inject(function ($controller, _Buildfire_, _$rootScope_, _Modals_, _DB_, _$timeout_, _COLLECTIONS_, _Orders_, _AppConfig_, _Messaging_, _EVENTS_, _PATHS_, _$csv_, _$q_) {
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
            Buildfire = _Buildfire_;
            /* Buildfire = {
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
             scrollTop: function () {
             }
             }
             };
             Buildfire.components.carousel = jasmine.createSpyObj('Buildfire.components.carousel', ['editor', '', '']);
             Buildfire.components.carousel.editor.and.callFake(function () {
             return {
             loadItems: function () {
             console.log("editor.loadItems hasbeen called");
             }
             };
             });*/
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
        xit('it should pass if ContentHome.itemSortableOptions is defined', function () {
            expect(ContentHome.itemSortableOptions).not.toBeUndefined();
            ContentHome.items = [{title: 'item10'}, {title: 'item11'}, {title: 'item12'}];
            ContentHome.itemSortableOptions.stop({}, {item: {sortable: {dropIndex: 1}}});
        });
        describe('Function called ContentHome.itemSortableOptions.stop when next and pre available', function () {
            it('it should pass if ContentHome.itemSortableOptions.stop calls has been called', function () {
                var ui = {
                    item: {
                        sortable: {
                            dropindex: 1
                        }
                    }
                };
                ContentHome.items = [{
                    data: {
                        listImage: '',
                        itemTitle: '',
                        images: [],
                        summary: '',
                        bodyContent: '',
                        bodyContentHTML: '',
                        addressTitle: '',
                        sections: ['123124234'],
                        address: {
                            lat: '28',
                            lng: '77',
                            aName: 'Office'
                        },
                        links: [],
                        backgroundImage: '',
                        rank: 20
                    }
                }, {
                    data: {
                        listImage: '',
                        itemTitle: '',
                        images: [],
                        summary: '',
                        bodyContent: '',
                        bodyContentHTML: '',
                        addressTitle: '',
                        sections: ['123124234'],
                        address: {
                            lat: '28',
                            lng: '77',
                            aName: 'Office'
                        },
                        links: [],
                        backgroundImage: '',
                        rank: 30
                    }
                }, {
                    data: {
                        listImage: '',
                        itemTitle: '',
                        images: [],
                        summary: '',
                        bodyContent: '',
                        bodyContentHTML: '',
                        addressTitle: '',
                        sections: ['123124234'],
                        address: {
                            lat: '28',
                            lng: '77',
                            aName: 'Office'
                        },
                        links: [],
                        backgroundImage: '',
                        rank: 40
                    }
                }];
                ContentHome.Items = {
                    update: function (id, data) {
                        var deferred = $q.defer();
                        deferred.resolve({id: id, data: data});
                        return deferred.promise;
                    }
                };
                ContentHome.itemSortableOptions.stop({}, ui);
                //expect(ContentHome.itemSortableOptions.stop).toHaveBeenCalled();
            });
        });
        describe('Function called ContentHome.itemSortableOptions.stop when pre available', function () {
            it('it should pass if ContentHome.itemSortableOptions.stop calls has been called', function () {
                var ui = {
                    item: {
                        sortable: {
                            dropindex: 1
                        }
                    }
                };
                ContentHome.items = [{
                    data: {
                        listImage: '',
                        itemTitle: '',
                        images: [],
                        summary: '',
                        bodyContent: '',
                        bodyContentHTML: '',
                        addressTitle: '',
                        sections: ['123124234'],
                        address: {
                            lat: '28',
                            lng: '77',
                            aName: 'Office'
                        },
                        links: [],
                        backgroundImage: '',
                        rank: 20
                    }
                }, {
                    data: {
                        listImage: '',
                        itemTitle: '',
                        images: [],
                        summary: '',
                        bodyContent: '',
                        bodyContentHTML: '',
                        addressTitle: '',
                        sections: ['123124234'],
                        address: {
                            lat: '28',
                            lng: '77',
                            aName: 'Office'
                        },
                        links: [],
                        backgroundImage: '',
                        rank: 30
                    }
                }];
                ContentHome.Items = {
                    update: function (id, data) {
                        var deferred = $q.defer();
                        deferred.resolve({id: id, data: data});
                        return deferred.promise;
                    }
                };
                ContentHome.itemSortableOptions.stop({}, ui);
                //expect(ContentHome.itemSortableOptions.stop).toHaveBeenCalled();
            });
        });
        describe('Function called ContentHome.itemSortableOptions.stop when next available', function () {
            it('it should pass if ContentHome.itemSortableOptions.stop calls has been called', function () {
                var ui = {
                    item: {
                        sortable: {
                            dropindex: 0
                        }
                    }
                };
                ContentHome.items = [{
                    data: {
                        listImage: '',
                        itemTitle: '',
                        images: [],
                        summary: '',
                        bodyContent: '',
                        bodyContentHTML: '',
                        addressTitle: '',
                        sections: ['123124234'],
                        address: {
                            lat: '28',
                            lng: '77',
                            aName: 'Office'
                        },
                        links: [],
                        backgroundImage: '',
                        rank: 20
                    }
                }, {
                    data: {
                        listImage: '',
                        itemTitle: '',
                        images: [],
                        summary: '',
                        bodyContent: '',
                        bodyContentHTML: '',
                        addressTitle: '',
                        sections: ['123124234'],
                        address: {
                            lat: '28',
                            lng: '77',
                            aName: 'Office'
                        },
                        links: [],
                        backgroundImage: '',
                        rank: 30
                    }
                }];
                ContentHome.Items = {
                    update: function (id, data) {
                        var deferred = $q.defer();
                        deferred.resolve({id: id, data: data});
                        return deferred.promise;
                    }
                };
                ContentHome.itemSortableOptions.stop({}, ui);
                //expect(ContentHome.itemSortableOptions.stop).toHaveBeenCalled();
            });
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
        it('should do nothing when isBusy(fetching)', function () {
            ContentHome.isBusy = true;
            ContentHome.getMore();
        });

        it('should do nothing when noMore (all data loaded)', function () {
            ContentHome.noMore = false;
            ContentHome.getMore();
        });
    });


    describe('Unit: ContentHome.getTemplate', function () {
        var spy;
        beforeEach(inject(function () {

            spy = spyOn($csv, 'download').and.callFake(function () {
            });

        }));

        it('should be able to call csv.download', function () {
            ContentHome.getTemplate();
            expect(spy).toHaveBeenCalled();
        });

    });

    describe('Unit: ContentHome.openImportCSVDialog', function () {
        var spy;
        beforeEach(inject(function () {

            spy = spyOn($csv, 'import').and.callFake(function () {
                var deferred = $q.defer();
                deferred.resolve([]);
                return deferred.promise;
            });

        }));

        it('should be able to call csv.import', function () {
            ContentHome.openImportCSVDialog();
            expect(spy).toHaveBeenCalled();
        });

    });
});
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
                    scrollTop: function () {
                    }
                },
                history: {
                    push: function (label, id) {
                    },
                    onPop: function (data) {
                    },
                    pop: function () {

                    }
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
            ContentHome = $controller('ContentHomeCtrl', {
                $scope: scope,
                MediaCenterInfo: null,
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


    describe('Unit: ContentHome to be defined', function () {
        it('should be defined', function () {
            expect(ContentHome).toBeDefined()
        });

    });
});
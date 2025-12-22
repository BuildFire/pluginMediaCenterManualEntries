(function (angular, buildfire) {
    angular
        .module('mediaCenterWidget')
        .service('CommentsService', function () {
            let service = this;

            service.openComments = function (itemId, commentIds, callback) {
                buildfire.spinner.show();

                const commentOptions = {
                    itemId: itemId,
                    translations: {
                        you: getString('comments.you'),
                        someone: getString('comments.someone'),
                        report: getString('comments.report'),
                        delete: getString('comments.delete'),
                        readMore: getString('comments.readMore'),
                        readLess: getString('comments.readLess'),
                        commentsHeader: getString('comments.commentsHeader'),
                        emptyStateTitle: getString('comments.emptyStateTitle'),
                        emptyStateMessage: getString('comments.emptyStateMessage'),
                        addCommentPlaceholder: getString('comments.addCommentPlaceholder'),
                        commentReported: getString('comments.commentReported'),
                        commentDeleted: '',
                        commentAdded: '',
                    }
                };

                if (commentIds && commentIds.length) {
                    commentOptions.filter = { commentIds };
                }

                buildfire.components.comments.open(commentOptions, (error) => {
                    buildfire.spinner.hide();
                    if (error) {
                        buildfire.dialog.toast({
                            message: getString('comments.openCommentError'),
                            type: 'danger'
                        });
                        console.error(error);
                    }

                    if (commentIds && commentIds.length) {
                        buildfire.services.reportAbuse.triggerWidgetReadyForAdminResponse();

                        buildfire.services.reportAbuse.onAdminResponse((event) => {
                            if (event.action === "markSafe") {
                                buildfire.services.reportAbuse.triggerOnAdminResponseHandled({ reportId: event.report.id });
                                buildfire.components.comments.close();
                            } else if (event.action === "markAbuse") {
                                buildfire.components.comments.deleteComment({
                                    itemId: itemId,
                                    commentId: commentIds[0]
                                }, (error) => {
                                    if (error) {
                                        console.error(error);
                                    } else {
                                        buildfire.services.reportAbuse.triggerOnAdminResponseHandled({ reportId: event.report.id });
                                        buildfire.components.comments.onDelete();
                                        buildfire.components.comments.close();
                                    }
                                });
                            }
                        });
                    }
                    if (service.onOpen) service.onOpen();
                    if (callback) callback(error);
                });
            };

            service.getCommentsCount = function (itemId, callback) {
                buildfire.components.comments.getSummaries({
                    itemIds: [itemId]
                }, (error, result) => {
                    if (!error && result && result[0] && result[0].count) {
                        callback(null, result[0].count);
                    } else {
                        callback(error, 0);
                    }
                });
            };

            service.setCommentCallbacks = function (onAdd, onDelete, onOpen, onClose) {
                buildfire.components.comments.onAdd = onAdd;
                buildfire.components.comments.onDelete = onDelete;
                buildfire.components.comments.onClose = onClose;
                service.onOpen = onOpen;
            };

            return service;
        });
})(window.angular, window.buildfire);

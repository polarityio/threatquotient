'use strict';

polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  timezone: Ember.computed('Intl', function() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }),
  createCommentError: '',
  loadingComments: false,
  loadingAttributes: false,
  /**
   * The contents of the new comment
   */
  newComment: '',
  createButtonDisabled: false,
  showAddComment: false,
  showAddAttribute: false,
  showAddTag: false,
  selectedAddAttributeName: '',
  selectedAddAttributeValue: '',
  addTagError: '',
  newTagName: '',
  loadingCommentsMessage: '',
  actions: {
    hideDeleteCommentConfirmation(commentIndex) {
      this.set('details.comments.' + commentIndex + '.__showDeleteConfirmation', false);
    },
    showDeleteCommentConfirmation(commentIndex) {
      this.set('details.comments.' + commentIndex + '.__showDeleteConfirmation', true);
    },
    showEditCommentModal(commentIndex) {
      this.set('details.comments.' + commentIndex + '.__showEditConfirmation', true);
    },
    hideEditCommentModal(commentIndex) {
      this.set('details.comments.' + commentIndex + '.__showEditConfirmation', false);
      this.set('details.comments.' + commentIndex + '._updateCommentError', '');
    },
    closeAddComment: function() {
      this.set('showAddComment', false);
      this.set('createCommentError', '');
      this.set('newComment', '');
    },
    changeTab: function(tabName) {
      this.set('activeTab', tabName);
    },
    updateWatchlist: function() {
      let watchlist = this.get('details.watchlist');
      let payload;

      if (watchlist.length === 0) {
        payload = {
          data: { indicatorId: this.get('details.id') },
          type: 'ADD_TO_WATCHLIST'
        };
      } else {
        payload = {
          data: {
            indicatorId: this.get('details.id'),
            watchlistId: this.get('details.watchlist.0.id')
          },
          type: 'REMOVE_FROM_WATCHLIST'
        };
      }

      this.sendIntegrationMessage(payload)
        .then(function(watchlist) {
          self.set('details.watchlist', [watchlist]);
        })
        .catch(function(err) {
          console.error(err);
        });
    },
    updateComment: function(commentIndex, indicatorCommentId, value) {
      const self = this;

      if (value.length === 0) {
        self.set('details.comments.' + commentIndex + '._updateCommentError', 'Please provide a comment');
        return;
      }

      this.set('details.comments.' + commentIndex + '.__commentUpdating', true);

      const payload = {
        type: 'UPDATE_COMMENT',
        data: { indicatorCommentId: indicatorCommentId, value: value }
      };

      this.sendIntegrationMessage(payload)
        .then(function(comment) {
          self.getComments(function() {});
        })
        .catch(function(err) {
          console.error(err);
          self.set('details.comments.' + commentIndex + '._updateCommentError', err.detail);
        })
        .finally(function() {
          self.set('details.comments.' + commentIndex + '.__commentUpdating', false);
        });
    },
    createComment: function() {
      const self = this;
      let comment = self.get('newComment');

      if (comment.length === 0) {
        return self.set('createCommentError', 'Please provide a comment');
      }

      self.set('createButtonDisabled', true);

      const payload = {
        type: 'CREATE_COMMENT',
        data: { id: this.get('details.id'), comment: comment }
      };

      this.sendIntegrationMessage(payload)
        .then(function(comment) {
          self.getComments(function() {
            self.set('newComment', '');
            self.set('createCommentError', '');
            self.set('showAddComment', false);
            self.set('createButtonDisabled', false);
          });
        })
        .catch(function(err) {
          console.error(err);
          self.set('createCommentError', err.detail);
          self.set('createButtonDisabled', false);
        });
    },
    updateAttribute(attributeIndex, attributeId, value) {
      const self = this;
      self.set('attributeErrorMessage', '');
      self.set('details.attributes.' + attributeIndex + '.__showEditModal', false);
      self.set('loadingAttributesMessage', 'Updating Attribute ...');

      const payload = {
        type: 'UPDATE_INDICATOR_ATTRIBUTE',
        data: { indicatorId: this.get('details.id'), indicatorAttributeId: attributeId, value: value }
      };

      this.sendIntegrationMessage(payload)
        .then(function() {
          self.getAttributes(function(err) {
            if (err) {
              self.set('attributeErrorMessage', err.detail);
            }
          });
        })
        .catch(function(err) {
          console.error(err);
          self.set('attributeErrorMessage', err.detail);
        });
    },
    addAttribute(name, value) {
      const self = this;

      if (value.length === 0) {
        return self.set('attributeErrorMessage', 'You must provide an attribute value');
      }

      self.set('attributeErrorMessage', '');
      self.set('showAddAttribute', false);
      self.set('loadingAttributesMessage', 'Adding Attribute ...');
      self.set('selectedAddAttributeValue', '');
      self.set('selectedAddAttributeName', '');

      const payload = {
        type: 'ADD_ATTRIBUTE',
        data: { indicatorId: this.get('details.id'), attributeName: name, attributeValue: value }
      };

      this.sendIntegrationMessage(payload)
        .then(function() {
          self.getAttributes(function(err) {
            if (err) {
              self.set('attributeErrorMessage', typeof err.detail === 'string' ? err.detail : JSON.stringify(err));
            }
          });
        })
        .catch(function(err) {
          console.error(err);
          self.set('attributeErrorMessage', typeof err.detail === 'string' ? err.detail : JSON.stringify(err));
        });
    },
    showAddAttribute() {
      this.set('showAddAttribute', true);
    },
    hideAddAttributeModal() {
      this.set('showAddAttribute', false);
      this.set('attributeErrorMessage', '');
      this.set('selectedAddAttributeName', '');
      this.set('selectedAddAttributeValue', '');
    },
    editAttribute(attributeIndex, attributeValue) {
      this.set('details.attributes.' + attributeIndex + '._shadowValue', attributeValue);
      this.set('details.attributes.' + attributeIndex + '.__showEditModal', true);
    },
    hideAttributeEditModal(attributeIndex) {
      this.set('details.attributes.' + attributeIndex + '.__showEditModal', false);
    },
    deleteAttribute(attributeIndex, indicatorAttributeId, attributeName) {
      let self = this;
      this.set('details.attributes.' + attributeIndex + '.__showEditModal', false);

      const payload = {
        type: 'DELETE_ATTRIBUTE',
        data: {
          indicatorId: this.get('details.id'),
          indicatorAttributeId: indicatorAttributeId
        }
      };

      this.sendIntegrationMessage(payload)
        .then(function() {
          self._flashSuccess(`Successfully deleted attribute '${attributeName}'`);
          self.getAttributes(function(err) {
            if (err) {
              self.set('attributeErrorMessage', err.detail);
            }
          });
        })
        .catch(function(err) {
          self.set('attributeErrorMessage', typeof err.detail === 'string' ? err.detail : JSON.stringify(err));
        });
    },
    addTag() {
      let self = this;

      const payload = {
        type: 'ADD_TAG',
        data: {
          indicatorId: this.get('details.id'),
          tagName: this.get('newTagName')
        }
      };

      this.sendIntegrationMessage(payload).then(
        function(tag) {
          console.info(tag);
          self.set('actionMessage', 'Added Tag');
          self.get('details.tags').pushObject(tag);
          self.set('newTagName', '');
        },
        function(err) {
          console.error(err);
          self._flashError(err.meta.detail, 'error');
        }
      );
    },
    deleteTag(tagId) {
      let self = this;

      const payload = {
        type: 'DELETE_TAG',
        data: {
          indicatorId: this.get('details.id'),
          tagId: tagId
        }
      };

      this.sendIntegrationMessage(payload).then(
        function() {
          self.set('actionMessage', 'Deleted Tag');
          const newTags = [];
          let tags = self.get('details.tags');
          tags.forEach(function(tag) {
            if (tag.id !== tagId) {
              newTags.push(tag);
            }
          });

          self.set('details.tags', newTags);
        },
        function(err) {
          console.error(err);
          self._flashError(err.meta.detail, 'error');
        }
      );
    },
    deleteComment(commentId) {
      let self = this;

      self.set('loadingCommentsMessage', 'Deleting Comment');
      self.set('loadingComments', true);

      const payload = {
        type: 'DELETE_COMMENT',
        data: {
          indicatorId: this.get('details.id'),
          commentId: commentId
        }
      };

      this.sendIntegrationMessage(payload)
        .then(function() {
          self.set('actionMessage', 'Deleted Comment');
          self.getComments(function() {});
        })
        .catch(function(err) {
          console.error(err);
          self._flashError(err.meta.detail, 'error');
        })
        .finally(function() {
          self.set('loadingComments', false);
        });
    }
  },
  getAttributes: function(cb) {
    const self = this;
    const payload = { type: 'GET_ATTRIBUTES', data: { id: this.get('details.id') } };
    let getAttributeError = null;

    self.set('loadingAttributesMessage', 'Loading Attributes ...');

    this.sendIntegrationMessage(payload)
      .then(function(result) {
        self.set('details.totalAttributes', result.totalAttributes);
        self.set('details.attributes', result.attributes);
      })
      .catch(function(err) {
        console.error(err);
        getAttributeError = err;
      })
      .finally(function() {
        self.set('loadingAttributesMessage', '');
        if (typeof cb === 'function') {
          cb(getAttributeError);
        }
      });
  },
  getComments: function(cb) {
    const self = this;

    self.set('loadingCommentsMessage', 'Loading Comments');
    self.set('loadingComments', true);

    const payload = { type: 'GET_COMMENTS', data: { id: this.get('details.id') } };

    this.sendIntegrationMessage(payload)
      .then(function(result) {
        self.set('details.totalComments', result.totalComments);
        self.set('details.comments', result.comments);
        self.set('createCommentError', '');
      })
      .catch(function(err) {
        console.error(err);
        self.set('createCommentError', err.detail);
      })
      .finally(function() {
        self.set('loadingComments', false);
        if (typeof cb === 'function') {
          cb();
        }
      });
  },
  onDetailsOpened() {},
  onDetailsClosed() {},
  _flashError: function(msg) {
    this.get('flashMessages').add({
      message: 'ThreatQ: ' + msg,
      type: 'unv-danger',
      timeout: 3000
    });
  },
  _flashSuccess: function(msg) {
    this.get('flashMessages').add({
      message: 'ThreatQ: ' + msg,
      type: 'unv-success',
      timeout: 3000
    });
  }
});

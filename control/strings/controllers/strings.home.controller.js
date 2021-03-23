(function (angular, window) {
    'use strict';
    angular
        .module('mediaCenterStrings')
        .controller('StringsCtrl', ['$scope', function ($scope) {
          var Strings=this;
          let strings;
          Strings.loadLanguage = function(lang){
              stringsContainer.classList.add("hidden");
              strings = new buildfire.services.Strings(lang,stringsConfig);
              stringsUI.init("stringsContainer",strings,stringsConfig);
              strings.init().then(()=>{
                Strings.showNewLanguageState( strings.id );
                  strings.inject();
              });
          }
          Strings.loadLanguage("en-us");
          Strings.showNewLanguageState= function(show){
              if(show) {
                  saveButton.classList.remove("hidden");
                  stringsContainer.classList.remove("hidden");
              }
              else{
                  saveButton.classList.add("hidden");
                  stringsContainer.classList.add("hidden");
                  Strings.createLanguage("en-us");
              }
          }
          Strings.createLanguage = function (language){
              stringsContainer.disabled=true;
              strings.createLanguage(language,()=>{
                  stringsContainer.disabled=false;
              });
              Strings.showNewLanguageState(true);
              return false;
          }
          Strings.deleteLanguage = function(){
              buildfire.notifications.confirm({message:"Are you sure you want to remove support fo this language?",confirmButton:{type:"danger"}},(e,r)=>{
                  if(r.selectedButton.key =="confirm") {
                      strings.deleteLanguage(() => {
                          // loadLanguage(langOptions.value);
                          Strings.showNewLanguageState();
                      });
                  }
              })
          }
          Strings.save = function (){
              strings.save(()=>{
                  buildfire.messaging.sendMessageToWidget({cmd:"refresh"})
              });
          }
        }]);
})(window.angular, window);

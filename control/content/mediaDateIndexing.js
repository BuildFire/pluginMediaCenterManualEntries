/*
  NOTES:
  THIS PART OF CODE IS USED FOR INDEXING OLD DATA. THIS PART WAS ADDED IN NOVEMBER, 2021. REMOVE THIS AFTER A WHILE SO WE DON'T KEEP "JUNK" AND "GHOST" CODE.
*/
     
function mainDateIndexCheck(callback){
    indexOldMediaDate(function(state){
      return callback(state);
    });
}

function indexOldMediaDate(callback) {
    buildfire.datastore.get("MediaCenter",function(err,resp){
        if(err || !resp || !resp.data || !resp.data.content){
            return callback(false);
        }else if(resp.data.content.dateIndexed){
            return callback(false);
        }else{
            showLoadingScreen();
            indexMediaContent(0,function(isFinished){
                if(!isFinished){
                    showFailedScreen();
                    return callback(false);
                }else{
                    updateMediaCenterFlag(resp,function(isFlagUpdated){
                        if(!isFlagUpdated)showFailedScreen();
                        else showSuccessScreen();
                        return callback(isFlagUpdated);
                    });
                }
            });
        }
    });
}

function indexMediaContent(page,callback) {
    buildfire.datastore.search({pageSize:50,page:page,recordCount: true}, "MediaContent", function (err, data) {
        //var totalRecords = data.totalRecord;
        if(err || !data){
            return callback(false);
        }
        if (data && data.result && data.result.length) {
            var items = data.result;
            for(var i=0;i<items.length;i++){
                indexItem(items[i],i,function(state,index){
                    if(!state){
                        return callback(false);
                    }else{
                        if(index == (items.length-1) && items.length != 50){
                            return callback(true);
                        }
                    }
                });
            }
        }
        if (data && data.result && data.result.length==50){
            indexMediaContent(page+1,function(state){return callback(state);});
        }else if(data && data.result && data.result.length==0)
            return callback(true);
    });
}

function indexItem(item,index,callback){
    var handleDate;
    if (item.data.mediaDate)
        handleDate = item.data.mediaDate;
    else
        handleDate = item.data.dateCreated;
    item.data.mediaDateIndex = new Date(handleDate).getTime();
    buildfire.datastore.update(item.id, item.data, "MediaContent", function(err, res){
        if(err)
            return callback(false,index);
        console.log(res.data.mediaDateIndex);
        return callback(true,index);
    });
}

function updateMediaCenterFlag(obj,callback){
    obj.data.content.dateIndexed=true;
    buildfire.datastore.update(obj.id,obj.data,"MediaCenter",function(err,data){
        if(err || !data){
            return callback(false);
        }else return callback(true);
    });
}

///////////////////////INFO DIALOGS///////////////////////

function removeDialog(){
    var indexingOldDataWrapperElem = document.getElementById('indexingOldDataWrapperElem');
    if(indexingOldDataWrapperElem)
        indexingOldDataWrapperElem.remove();
}

function showLoadingScreen(){
    var indexingOldDataWrapperElem = document.createElement('div');
    indexingOldDataWrapperElem.id = 'indexingOldDataWrapperElem';
    indexingOldDataWrapperElem.innerHTML = `
      <div style="border-radius: 4px; background-color: #fff; width: 80%;">
        <div style="padding: 11px 15px; background: #eef0f0; position: relative; font-size: 15px; line-height: 26px; border-top-left-radius: 4px; border-top-right-radius: 4px;">
          <h4 style="font-weight: bold">Notification</h4>
        </div>
        <div style="padding: 30px 15px; background-color: #fff; border-bottom-left-radius: 4px;border-bottom-right-radius: 4px;">
          <p style="text-align: center">We are improving your performance database. It will be done soon. Please do not close your browser.</p><div style="margin-top: 30px; display: flex; justify-content: center;"><div id="html-spinner" style="border-color: ${buildfire && buildfire.getContext() && buildfire.getContext().appTheme && buildfire.getContext().appTheme.colors ? buildfire.getContext().appTheme.colors.primaryTheme : '#000'}; border-top: 4px solid #fff"></div></div>
        </div>
      </div>
    `;
    document.body.appendChild(indexingOldDataWrapperElem);
  };
function showFailedScreen(){
    var indexingOldDataWrapperElem = document.getElementById('indexingOldDataWrapperElem');
    if (indexingOldDataWrapperElem) indexingOldDataWrapperElem.innerHTML = `
      <div style="border-radius: 4px; background-color: #fff; width: 80%;">
        <div style="padding: 11px 15px; background: #eef0f0; position: relative; font-size: 15px; line-height: 26px; border-top-left-radius: 4px; border-top-right-radius: 4px;">
          <h4 style="font-weight: bold">Notification</h4>
        </div>
        <div style="padding: 30px 15px; background-color: #fff;">
          <div style="width: 100%; display: flex; justify-content: center; margin-bottom: 15px;"><span class="mainPopupIcon alert-icon"></span></div><p style="text-align: center">Error while improving your database performance. Refresh your browser and try again.</p>
        </div>
        <div style="border-top: 1px solid #ddd!important; background-color: #fff; display: flex; justify-content: flex-end; border-bottom-left-radius: 4px; border-bottom-right-radius: 4px;">
          <div style="height: 66px; overflow: hidden; border-radius: 0 0 4px 4px; padding: 13px;">
            <a onclick="const indexingOldDataWrapperElem = document.getElementById('indexingOldDataWrapperElem'); indexingOldDataWrapperElem.remove()" class="btn btn-danger" href="#" style="min-width: 100px; padding: 8px; display: inline-block; cursor: pointer; text-decoration: none;">OK</a>
          </div>
        </div>
      </div>
    `;
    setTimeout(removeDialog(),4000);
  };
function showSuccessScreen(){
    var indexingOldDataWrapperElem = document.getElementById('indexingOldDataWrapperElem');
    if (indexingOldDataWrapperElem) indexingOldDataWrapperElem.innerHTML = `
      <div style="border-radius: 4px; background-color: #fff; width: 80%;">
        <div style="padding: 11px 15px; background: #eef0f0; position: relative; font-size: 15px; line-height: 26px; border-top-left-radius: 4px; border-top-right-radius: 4px;">
          <h4 style="font-weight: bold">Notification</h4>
        </div>
        <div style="padding: 30px 15px; background-color: #fff;">
          <div style="width: 100%; display: flex; justify-content: center; margin-bottom: 15px;"><span class="mainPopupIcon" style="border: 1px solid #14CB5D;"><svg xmlns="http://www.w3.org/2000/svg" height="60px" viewBox="0 0 24 24" width="60px" fill="#14CB5D"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg></span></div><p style="text-align: center">Database performance succesfully improved.</p>
        </div>
        <div style="border-top: 1px solid #ddd!important; background-color: #fff; display: flex; justify-content: flex-end; border-bottom-left-radius: 4px; border-bottom-right-radius: 4px;">
          <div style="height: 66px; overflow: hidden; border-radius: 0 0 4px 4px; padding: 13px;">
            <a onclick="const indexingOldDataWrapperElem = document.getElementById('indexingOldDataWrapperElem'); indexingOldDataWrapperElem.remove()"  class="btn btn-primary" href="#" style="min-width: 100px; padding: 8px; display: inline-block; cursor: pointer; text-decoration: none;">OK</a>
          </div>
        </div>
      </div>
    `
    setTimeout(removeDialog(),4000);
  };

  ///////////////////////INFO DIALOGS END///////////////////////
import "./jquery-3.4.0.min.js";
import "../lib/MicrosoftAjax.js";
import "../lib/sp.runtime.js";
import "../lib/sp.js";

export class SPDir {
  constructor(){
    this.fld = "!!!";
  }

  sendFile(record) {
    var folderServerRelativeUrl = "/Shared%20Documents/input";
  
  
    var fileCreateInfo;

    var clientContext= SP.ClientContext.get_current();
    var web = clientContext.get_web();
    var folder = web.getFolderByServerRelativeUrl(folderServerRelativeUrl);

    fileCreateInfo = new SP.FileCreationInformation();
    fileCreateInfo.set_url(rec.fname);
    fileCreateInfo.set_content(new SP.Base64EncodedByteArray());
    fileContent = rec.blob;
	
    for (var i = 0; i < fileContent.length; i++) {
        fileCreateInfo.get_content().append(fileContent.charCodeAt(i));
    }
	
	    this.newFile = folder.get_files().add(fileCreateInfo);
	
	    clientContext.load(this.newFile);
	    clientContext.executeQueryAsync(
	        Function.createDelegate(this, successHandler),
	        Function.createDelegate(this, errorHandler)
	    );
	
	    function successHandler() {
	        console.log("href="+folderServerRelativeUrl);
	    }
	
	    function errorHandler() {
	        console.error(arguments[1]);
	    }
  }



}

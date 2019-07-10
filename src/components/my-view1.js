import { LitElement, html, css} from 'lit-element';

import { SharedStyles } from './shared-styles.js';
import { ButtonSharedStyles } from './button-shared-styles.js';

class MyView1 extends LitElement {

  static get properties() {
    return {
      SBDis : String
      , TBDis : String
      , VPDis : String
      , photoCapabilities:Object
      , imageCapture:Object
      , constraints:Object
      , db_version:Number
      , frontCam:Boolean
      , src_video:String
      , overconstrainedError:Boolean
      , msg: String
      , cameraTag: Object
      , sendObj:Object
    }
  }

  constructor() {
    super()
    this.SBDis = 'inline';
    this.TBDis = 'none';
    this.db_version=document.phobas_db;
    this.frontCam=false;
    this.overconstrainedError=false;
    this.imageCapture=null;
    this.cameraTag=null;
    this.sendObj = document.sendObj;
  }

  static get styles() {
    return [
      SharedStyles
      , ButtonSharedStyles
    ];
  } 

  render() {
    return html`
      <section style="padding:0px">
        ${this.cameraTag}
        <img id="imgPict" width=100%></img>
        <div id="v1-errorMsg" width=100%></div>
      </section>
    `
  }

  firstUpdated(changedProperties) {
    console.log("Ready: ", changedProperties);
    this._handleShowClick();
  }

  initCam(){
    if (typeof ImageCapture == "undefined") {
/*    if (1==1) {*/
      this.cameraTag = html`<input type="file" accept="image/*" @change="${this._handleChange}" multiple>`;
    } else {
      try {
        this.cameraTag = html`<video id="videoPort" class="take_pict" style="display:block; pointer-events:none" width=100% autoplay muted playsinline></video>
          <div style="text-align:center;">
            <button id="takePict" class="take_pict" style="display:${this.TBDis}" @click="${this._handleTakeClick}">Take picture</button>
            <button id="RS" class="take_pict" style="display:${this.TBDis};" @click="${this._handleRevCam}">Reverse</button>
            <button id="showVideo" class="start_show" style="display:${this.SBDis}" @click="${this._handleShowClick}">Open camera</button>
          </div>`;

        if (this.imageCapture){
          this.imageCapture.track.stop();
          this.imageCapture=null;
        }
        try {
          this.shadowRoot.querySelector('#videoPort').srcObject = null;
        } catch(error) {}
        this.constraints = {
          audio: false,
          video: (this.overconstrainedError?true:{facingMode:{exact: (this.frontCam? "user" : "environment")}})
        };
        console.log(this.constraints);
        this.msg="getUserMedia";
        console.log(navigator.mediaDevices.getSupportedConstraints());
        console.log(navigator.mediaDevices.enumerateDevices());
      } catch(error) {
        console.error(error);
      }

      var objRoot = this;
      navigator.mediaDevices.getUserMedia(
        this.constraints
      ).then(stream => {
          console.log('getUserMedia');
          console.log(objRoot);
          objRoot.msg="handleSuccess";
          objRoot.handleSuccess(stream);
      }).catch(err => {objRoot.handleError(err, objRoot.msg)});
    }
  }

  _handleChange(event){
    var files=event.target.files;
    var img = this.shadowRoot.querySelector('#imgPict');
    var reader = new FileReader();
    reader.onload = function() {
      img.src = reader.result;
    };
    var sz=files.length;
    if (sz>0) {
      reader.readAsDataURL(files[sz-1]);
    };
    
    var glon=0;
    var glat=0;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position => {
        glon = position.coords.longitude;
        glat = position.coords.latitude;
        console.log(position);
      }));
    } else {
      console.log('Geolocation is not supported for this Browser/OS version yet.');
    };
    

    var db = openDatabase('PhoBas', this.db_version, "Photo album", 200000);
    console.log(db);

    if(db) {
    
      db.transaction(tx=>{
        tx.executeSql("create table IF NOT EXISTS folder ("
          +"id CHAR(50) PRIMARY KEY NOT NULL"
          +", fname  CHAR(50) NOT NULL"
          +", blob TEXT, lon REAL, lat REAL)", [], null, (tx, error)=>{this.errorMsg(error, "CREATE TABLE");}
        )
      });
    
      for (var fk = 0; fk < files.length; fk++) {
        var fileType = "image/*";
        var rand = Math.random().toString(36).substr(2, 16).toUpperCase();
        var fl={"id":rand, "fname":((files.item(fk).name==null || typeof(files.item(fk).name)=="undefined")?rand:files.item(fk).name), "blob":files.item(fk), "lon":glon, "lat":glat};

        this.sendObj.Blob2Base64(fl.blob, base64=>{

          db.transaction(tx => {
            tx.executeSql(
              "INSERT INTO folder (id, fname, blob, lon, lat) values(?, ?, ?, ?, ?)"
              , [fl.id, fl.fname, base64, fl.lon, fl.lat]
              , null
              , e=>{this.errorMsg(e, "INSERT")}
            )
          });

          this.writeLog("File added.");
        });
      };
    } else {
      this.writeLog("openDatabase PhoBas error");
    };


  }

  _handleShowClick(e) {
    console.log("_handleShowClick(e)");
    this.SBDis = 'none';
    this.TBDis = 'inline';
    this.initCam();
/*
    var request = window.IndexedDB.open('PhoBas',this.db_version);
    request.onupgradeneeded = (e => {
      const db = e.target.result;
      console.log("DB: ",db);
      try {
        this.objectStore = db.createObjectStore("folder", { keyPath: "id" })
      } catch(error) {
        console.error(error);
      };
    });
*/
  }

  _handleRevCam(e){
    this.frontCam = !this.frontCam;
    this.initCam();
  }

  handleSuccess(stream) {
    var video = this.shadowRoot.querySelector('#videoPort');
    var videoTracks=stream.getVideoTracks();
    this.msg+="<br>videoTracks: "+JSON.stringify(videoTracks)
    var streamTrack=videoTracks[0];
    this.msg+="<br>videoTracks[0].label: "+streamTrack.label;
    console.log(`Using video device: ${streamTrack.label}`);
    this.imageCapture = new ImageCapture(streamTrack);
    this.msg+="<br>"+JSON.stringify(this.imageCapture);
    this.imageCapture.getPhotoCapabilities().then(capabilities=>{
      this.photoCapabilities = capabilities;

      this.msg+="<br>video.srcObject";
      window.stream = stream; // make variable available to browser console
      video.srcObject = null;
      video.srcObject = stream;

    }).catch(err=>this.handleError(err, this.msg));

  }

  handleError(error, msg) {
    console.log("handleError: "+msg+", overconstrainedError: "+this.overconstrainedError);
    if (error.name === 'ConstraintNotSatisfiedError') {
      let v = this.constraints.video;
      this.errorMsg(`The resolution ${v.width.exact}x${v.height.exact} px is not supported by your device.`);
    } else if (error.name === 'PermissionDeniedError') {
      this.errorMsg('Permissions have not been granted to use your camera and ' +
        'microphone, you need to allow the page access to your devices in ' +
        'order for the demo to work.');
    } else if (((error.name == "OverconstrainedError") || (msg=="getUserMedia")) && !this.overconstrainedError) {
      console.log("this.overconstrainedError");
      this.errorMsg(error, msg);
      this.overconstrainedError = true;
      this.initCam();
    } else {
      this.errorMsg(error, msg);
    }
  }

  errorMsg(error, msg) {
    console.log(msg);
    console.error(error);
    const divLog=this.shadowRoot.getElementById('v1-errorMsg');
    divLog.innerHTML="<p>"+error.name+": "+msg+": "+JSON.stringify(error)+"</p>";
  }

  writeLog(msg) {
    console.log(msg);
    const divLog=this.shadowRoot.getElementById('v1-errorMsg');
    divLog.innerHTML="<p>"+msg+"</p>";
  }

  _handleTakeClick(e) {
    try {
      const img = this.shadowRoot.querySelector('#imgPict');
      console.log("photoCapabilities: ", this.photoCapabilities);
      this.imageCapture.takePhoto({
        imageHeight:this.photoCapabilities.imageHeight.max
        , imageWidth:this.photoCapabilities.imageWidth.max
      }).then(
        blob => {
        
          var db = openDatabase('PhoBas', this.db_version, "Photo album", 200000);
          console.log(db);

          if(db) {
          
            db.transaction(tx=>{
              tx.executeSql("create table IF NOT EXISTS folder ("
                +"id CHAR(50) PRIMARY KEY NOT NULL"
                +", fname  CHAR(50) NOT NULL"
                +", blob TEXT, lon REAL, lat REAL)", [], null, (tx, error)=>{this.errorMsg(error, "CREATE TABLE");}
              )
            });

            const rand = Math.random().toString(36).substr(2, 16).toUpperCase();
            var fl={"id":rand, "fname":rand, "blob":blob, "lon":0, "lat":0};

            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition((position => {
                fl.lon = position.coords.longitude;
                fl.lat = position.coords.latitude;
                console.log(position);
              }));
            } else {
              console.log('Geolocation is not supported for this Browser/OS version yet.');
            }

            this.sendObj.Blob2Base64(fl.blob, base64=>{


              db.transaction(tx => {
                tx.executeSql(
                  "INSERT INTO folder (id, fname, blob, lon, lat) values(?, ?, ?, ?, ?)"
                  , [fl.id, fl.fname, base64, fl.lon, fl.lat]
                  , null
                  , e=>{this.errorMsg(e, "INSERT")}
                )
              });

              img.src = URL.createObjectURL(blob);
              img.onload = () => { URL.revokeObjectURL(this.src); }
            })
          } else {
            this.writeLog("File added.");
            this.errorMsg(event, 'window.indexedDB.open');
            console.error('window.indexedDB.open error:', event);
          };
        }
      ).catch(error => {
        console.error('takePhoto() error:', error);
        this.errorMsg(error, 'takePhoto() error');
      });
    } catch(error) {
      console.error('takePhoto() error:', error);
      this.errorMsg(error, 'takePhoto() error');
    }
  }

}

window.customElements.define('my-view1', MyView1);

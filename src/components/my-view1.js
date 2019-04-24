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
      , file_id:Number
      , db_version:Number
      , frontCam:Boolean
      , src_video:String
      , overconstrainedError:Boolean
    }
  }

  constructor() {
    super()
    this.SBDis = 'inline';
    this.TBDis = 'none';
    this.file_id=0;
    this.db_version=1;
    this.frontCam=false;
    this.overconstrainedError=false;
    this.imageCapture=null;
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
        <video id="videoPort" class="take_pict" style="display:block; pointer-events:none" width=100% autoplay muted playsinline></video>
        <div>
          <button id="takePict" class="take_pict" style="display:${this.TBDis}" @click="${this._handleTakeClick}">Take picture</button>
          <button id="RS" class="take_pict" style="display:${this.TBDis};position:absolute;right:0;" @click="${this._handleRevCam}">Reverse</button>
          <button id="showVideo" class="start_show" style="display:${this.SBDis}" @click="${this._handleShowClick}">Open camera</button>
        </div>
        <img id="imgPict" width=100%></img>
        <div id="errorMsg"></div>
      </section>
    `
  }

  firstUpdated(changedProperties) {
    console.log("Ready: ", changedProperties);
    this._handleShowClick();
  }

  initCam(){
    if (this.imageCapture){
      this.imageCapture.track.stop();
      this.imageCapture=null;
    }
    this.shadowRoot.querySelector('#videoPort').srcObject = null;
    
    this.constraints = {
      audio: false,
      video: {facingMode: (this.overconstrainedError?"":{exact: (this.frontCam? "user" : "environment")})}
    };
    console.log(this.constraints);
    navigator.mediaDevices.getUserMedia(this.constraints).then(stream=>{
      console.log("stream",stream)
      console.log("getSupportedConstraints: ", navigator.mediaDevices.getSupportedConstraints());
      this.handleSuccess(stream);

    }).catch(err=>this.handleError(err));
  }

  _handleShowClick(e) {
    console.log("_handleShowClick(e)");
    this.initCam();

    this.SBDis = 'none';
    this.TBDis = 'inline';

    var request = window.indexedDB.open('PhoBas',this.db_version);
    request.onupgradeneeded = (e => {
      const db = e.target.result;
      console.log("DB: ",db);
      try {
        this.objectStore = db.createObjectStore("folder", { keyPath: "id" })
      } catch(error) {
        console.error(error);
      };
    });

  }

  _handleRevCam(e){
    this.frontCam = !this.frontCam;
    this.initCam();
  }

  handleSuccess(stream) {
    const video = this.shadowRoot.querySelector('#videoPort');
    const streamTrack = stream.getVideoTracks()[0];
    console.log(`Using video device: ${streamTrack.label}`);

    this.imageCapture = new ImageCapture(streamTrack);
    this.imageCapture.getPhotoCapabilities().then(capabilities=>{
      this.photoCapabilities = capabilities;
    });

    //window.stream = stream; // make variable available to browser console
    video.srcObject = null;
    video.srcObject = stream;
  }

  handleError(error) {
    if (error.name === 'ConstraintNotSatisfiedError') {
      let v = this.constraints.video;
      this.errorMsg(`The resolution ${v.width.exact}x${v.height.exact} px is not supported by your device.`);
    } else if (error.name === 'PermissionDeniedError') {
      this.errorMsg('Permissions have not been granted to use your camera and ' +
        'microphone, you need to allow the page access to your devices in ' +
        'order for the demo to work.');
    } else if (error.name === 'OverconstrainedError' && !this.overconstrainedError) {
      this.overconstrainedError = true;
      this.initCam();
    }
    this.errorMsg("getUserMedia error: "+error.name, error);
  }

  errorMsg(msg, error) {
    console.error(msg,error);
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
        

          const rand = Math.random().toString(36).substr(2, 16).toUpperCase();
          var file={"id":rand, "fname":rand, "blob":blob, "lon":0, "lat":0};

          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position => {
              file.lon = position.coords.longitude;
              file.lat = position.coords.latitude;
              console.log(position);
            }));
          } else {
            console.log('Geolocation is not supported for this Browser/OS version yet.');
          }

          const request = window.indexedDB.open('PhoBas',this.db_version);
          console.log(request);
          request.onsuccess = (e => {
            const db = e.target.result;
            const objectStore = db.transaction("folder", "readwrite").objectStore("folder");
            objectStore.add(file);
            this.file_id += 1;

            console.log("objectStore: ", objectStore);
          });
          request.onerror = function(event) {
            console.error('window.indexedDB.open error:', event);
          };

          img.src = URL.createObjectURL(blob);
          img.onload = () => { URL.revokeObjectURL(this.src); }
        }
      ).catch(error => console.error('takePhoto() error:', error));

    } catch (e) {
      this.handleError(e);
    }
  }

}

window.customElements.define('my-view1', MyView1);

let camera = document.getElementById("camera");
let creeper = document.getElementById("creeper");

let box1 = document.getElementById("box1");
let box2 = document.getElementById("box2");
let box3 = document.getElementById("box3");
let box4 = document.getElementById("box4");
let box5 = document.getElementById("box5");
let box6 = document.getElementById("box6");
let box7 = document.getElementById("box7");
let box8 = document.getElementById("box8");
let box9 = document.getElementById("box9");
let box10 = document.getElementById("box10");

let allBoxes = [box1, box2, box3, box4, box5, box6, box7, box8, box9, box10];

let scene = document.getElementById("scene");

// Ignore any errors

class Model extends Croquet.Model {
  init() {
    this.subscribe(this.sessionId, "view-join", this.viewJoined);
    this.subscribe(this.sessionId, "view-exit", this.viewExited);
    
    this.indexToViewId = new Map();
    
    for (let i = 0; i < 10; i++) {
      this.indexToViewId.set(i, "no");
    }
    
    this.test = 1;
    
    this.subscribe("user", "position", this.processUserPositionData);
    
    this.subscribe("creeper", "data", this.creeperNow)
    
    this.subscribe("correctUser", "check", this.handleNewUserCheck);
    
    this.future(10).sendPositions();
        
    this.userIdToPosition = new Map();  
    
    this.creeperPosition = new THREE.Vector3(0, 40, 0);
    this.creeperRotation = new THREE.Vector3(-90, 0, 0);
    
    this.newUser;
    
    this.health = 150;
    this.chasing = true;
        
    this.subscribe("boss", "loseHealth", this.bossLoseHealth);
  }
  
  static types() {
    return {
      "THREE.Vector3": THREE.Vector3,
      "THREE.Quaternion": THREE.Quaternion,
      "THREE.Euler": THREE.Euler
    }
  }
  
  bossLoseHealth() {
    if (this.health > 0) {
      this.health -= 1;
    } else if (this.health <= 0) {
      this.chasing = false;
      let gainHealth = window.setInterval(() => {
        this.health += 200 / 2000;
      }, 1)
      
      window.setTimeout(() => {
        window.clearInterval(gainHealth);
        this.health = 150;
        this.chasing = true;
      }, 10000)
    }
  }
  
  handleNewUserCheck() {
    this.newUser = undefined;
  }
  
  creeperNow(data) {
    if (this.chasing == true) {
      this.creeperPosition = data.position;
      this.creeperRotation = data.rotation;
    }
  }
  
  sendPositions() {
    if (this.newUser) {
      this.publish("makeSure", "update", {id: this.newUser, position: this.creeperPosition, rotation: this.creeperRotation})
    }
    
    this.publish("all", "userpositions", {map: this.userIdToPosition, boxMap: this.indexToViewId})
    if (this.chasing == true) {
      this.publish("send", "creeper", 1);
    }
    this.publish("health", "status", this.health)
    this.future(10).sendPositions();    
  }
  
  processUserPositionData(data) {
    this.userIdToPosition.set(data.id, data.position);
  }
  
  
  
  viewJoined(viewId) {  
    for (let [key, value] of this.indexToViewId) {
      if (value == "no") {
        this.indexToViewId.set(key, viewId)
        break;
      }
    }
    
    this.newUser = viewId;
    this.userIdToPosition.set(viewId, new THREE.Vector3(0, 0, 0));
  }
  
  viewExited(viewId) {
    for (let [key, value] of this.indexToViewId) {
      if (value == viewId) {
        this.indexToViewId.set(key, "no");
        break;
      }
    }
    
    this.userIdToPosition.delete(viewId);
    this.publish("userLeft", "true", {id: viewId})
  }
  
}

Model.register("Model");

class View extends Croquet.View {
  constructor(model) {
    super(model);
    
    this.subscribe("userLeft", "true", this.deleteUserCube);
    
    this.subscribe("all", "userpositions", this.processEVERYUserPosition);
    
    this.subscribe("send", "creeper", this.processCreeper);
        
    this.subscribe("makeSure", "update", this.makeSureCheck);
    
    this.subscribe("health", "status", this.updateHealth)
    
    //this.subscribe("creeper", "position", this.goCreeper);
        
    this.userIdToPositionCubes = new Map();
    
    this.indexToViewIdView = new Map();
    
    this.userIdToPositionView = new Map();
    
    this.index;
    
    this.future(10).sendPosition();
    
    this.sendingCreeperData = false;
    
    this.usingAudio = false;
    
    this.future(1000).checkUserPosition();
    
    this.hitCabability = false;
    
    window.addEventListener("click", () => {
      if (this.hitCabability == true) {
        this.publish("boss", "loseHealth");
      }
    })
    
  }
  
  updateHealth(health) {
    document.getElementById("health").value = `${health}`;
  }
  
  checkUserPosition() {
    this.future(10).checkUserPosition();
  }
  
  makeSureCheck(data) {
    if (data.id == this.viewId) {
      if (data.position && data.rotation) {        
        document.getElementById("creeper").object3D.position.x = data.position.x;
        document.getElementById("creeper").object3D.position.y = data.position.y;
        document.getElementById("creeper").object3D.position.z = data.position.z;
        
        document.getElementById("creeper").object3D.rotation.x = data.rotation.x;
        document.getElementById("creeper").object3D.rotation.y = data.rotation.y;
        document.getElementById("creeper").object3D.rotation.z = data.rotation.z;
        
        this.sendingCreeperData = true;
        this.publish("correctUser", "check")
      }
    }
  }
  
  processCreeper() {
    if ((this.userIdToPositionView) && (this.userIdToPositionView) && (this.sendingCreeperData)) {
      let magnitudes = [];
      let lowestMag;

      for (let [key, value] of this.userIdToPositionView) {
        let positionVectorCreeperToUser = new THREE.Vector3(creeper.object3D.position.x - value.x, creeper.object3D.position.y - value.y, creeper.object3D.position.z - value.z);

        magnitudes.push(positionVectorCreeperToUser.length());
      }

      lowestMag = Math.min(...magnitudes);
      // document.getElementById("creeperGotYou").play();
      let thisMagnitude = new THREE.Vector3(creeper.object3D.position.x - camera.object3D.position.x, creeper.object3D.position.y - camera.object3D.position.y, creeper.object3D.position.z - camera.object3D.position.z);
      console.log(thisMagnitude);
      if (thisMagnitude.length() <= 10) {
        document.getElementById("creeperGotYou").play();
        
        // Creeper Caught You!
        
        camera.object3D.position.set(0, 100, 0);
        camera.object3D.lookAt(0, 0, 0);
        
        window.setTimeout(() => {
          camera.object3D.position.set(Math.random() * 200, 40, Math.random() * 200);
        }, 5000)
      }
      
      if (thisMagnitude.length() <= 40) {
        this.hitCabability = true;
      } else {
        this.hitCabability = false;
      }

      for (let [key, value] of this.userIdToPositionView) {
        let positionVectorFinal = new THREE.Vector3(creeper.object3D.position.x - value.x, creeper.object3D.position.y - value.y, creeper.object3D.position.z - value.z);

        if (positionVectorFinal.length() == lowestMag) {
          creeper.object3D.lookAt(value.x, 0, value.z);
          creeper.object3D.rotation.x -= Math.PI;
          creeper.object3D.rotation.y += Math.PI;

          // GO CREEPER GO!

          let creeperEuler = new THREE.Euler(creeper.object3D.rotation.x + Math.PI / 2, creeper.object3D.rotation.y - Math.PI, creeper.object3D.rotation.z);
          let creeperMoveVector = new THREE.Vector3(0, 0, 0.1).applyEuler(creeperEuler);

          creeperMoveVector.y = 0;

          creeper.object3D.position.add(creeperMoveVector);   
          
          this.publish("creeper", "data", {position: new THREE.Vector3(creeper.object3D.position.x, creeper.object3D.position.y, creeper.object3D.position.z), rotation: new THREE.Vector3(creeper.object3D.rotation.x, creeper.object3D.rotation.y, creeper.object3D.rotation.z)});
        }
      }
    }
  }
  
  processEVERYUserPosition(data) {
    this.userIdToPositionView = data.map;
    this.indexToViewIdView = data.boxMap;
        
    for (let [key, value] of this.indexToViewIdView) {
      for (let [key2, value2] of this.userIdToPositionView) {
        if (value == key2) {
          if (value != this.viewId) {
            allBoxes[key].object3D.position.set(value2.x, value2.y, value2.z);
            break;
          }
        }
      }
    }
  }
  
  deleteUserCube(data) {
    this.userIdToPositionCubes.delete(data.id);
  }
  
  sendPosition() {
    this.publish("user", "position", {position: camera.object3D.position, id: this.viewId});
    this.future(10).sendPosition();
  }
}

Croquet.Session.join({
  appId: "io.croquet.hello",
  name: "multiboss",
  password: "please",
  model: Model,
  view: View
});

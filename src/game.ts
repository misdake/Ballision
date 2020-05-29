import * as THREE from "three";
import {Camera, Scene} from "three";
import {Texture} from "three/src/textures/Texture";

const textureLoader = new THREE.TextureLoader();

const ACC = 2;
const FRICTION = 0.5;

export class Ball {

    alive: boolean;
    follow: boolean;

    startx: number;
    starty: number;
    x: number;
    y: number;
    vx: number;
    vy: number;

    fx: number;
    fy: number;

    controller: Controller;

    sphere: THREE.Mesh;

    constructor(x: number, y: number, texture: Texture) {
        this.startx = x;
        this.starty = y;
        this.follow = false;

        let material = new THREE.MeshStandardMaterial();
        material.color.setRGB(0.8, 0.8, 0.8);
        material.emissive.setRGB(0.2, 0.2, 0.2);
        this.sphere = new THREE.Mesh(new THREE.SphereBufferGeometry(0.5, 32, 16), material);
        this.sphere.position.set(0, 0.5, 0);
        this.sphere.castShadow = true; //default is false
        this.sphere.receiveShadow = true; //default is false
        material.map = texture;
        material.emissiveMap = texture;
    }

    setController(controller: Controller) {
        this.controller = controller;
    }

    reset() {
        this.x = this.startx;
        this.y = this.starty;
        this.alive = true;
        this.vx = 0;
        this.vy = 0;

        this.fx = 0;
        this.fy = 0;

        this.controller.reset();
    }

    updateForce(dt: number) {
        let {fx, fy} = this.controller.fetch(dt);
        this.fx = fx;
        this.fy = fy;
    }

    updatePosRot(dt: number) {
        let dv = ACC * dt;
        let right = this.fx;
        let back = this.fy;
        let dvx = right * dv;
        let dvy = back * dv;

        this.vx += dvx;
        this.vy += dvy;

        let vlen = Math.hypot(this.vx, this.vy);
        let newvlen = Math.max(0, vlen - FRICTION * dt);
        if (newvlen === 0) {
            this.vx = 0;
            this.vy = 0;
        } else {
            this.vx = this.vx / vlen * newvlen;
            this.vy = this.vy / vlen * newvlen;
        }

        let dx = this.vx * dt;
        let dy = this.vy * dt;
        this.x += dx;
        this.y += dy;

        let len = Math.hypot(dx, dy);
        let rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(dy / len, 0, -dx / len), len / 0.5);
        this.sphere.setRotationFromQuaternion(this.sphere.quaternion.premultiply(rot));
    }

    updateSphere() {
        this.sphere.position.set(this.x, 0.5, this.y);
        this.sphere.visible = this.alive;
    }

}

export interface Controller {
    fetch(dt: number): { fx: number, fy: number };
    reset(): void;
}

enum AiMode {
    CENTER,
    BALL,
}

class AiController implements Controller {
    private game: Game;
    private ball: Ball;
    constructor(ball: Ball, game: Game) {
        this.ball = ball;
        this.game = game;
    }

    private mode: AiMode;
    private target: Ball;
    private modeTime: number;
    reset() {
        this.mode = AiMode.CENTER;
        this.modeTime = 0;
    }
    fetch(dt: number): { fx: number; fy: number } {
        this.modeTime -= dt;
        if (this.modeTime < 0) {
            let valid = this.game.balls.filter(ball => ball !== this.ball && ball.alive);
            if (valid.length) {
                this.target = valid[~~(valid.length * Math.random())];
                this.modeTime = Math.random() * 4;
                this.mode = AiMode.BALL;
            } else {
                this.modeTime = 1;
                this.mode = AiMode.CENTER;
            }
        }

        let rad = Math.hypot(this.ball.x, this.ball.y);
        let dirx = this.ball.x / rad;
        let diry = this.ball.y / rad;
        let vcenter = this.ball.vx * dirx + this.ball.vy * diry;
        if (vcenter > 0) {
            if (rad + vcenter * vcenter / 2 / ACC > 5) {
                this.modeTime = 1;
                this.mode = AiMode.CENTER;
            }
        }

        let tx = 0;
        let ty = 0;
        switch (this.mode) {
            case AiMode.CENTER:
                break;
            case AiMode.BALL:
                tx = this.target.x;
                ty = this.target.y;
                break;
        }

        let dx = tx - this.ball.x;
        let dy = ty - this.ball.y;
        let d = Math.hypot(dx, dy);
        if (d > 0.2) {
            dx = dx / d;
            dy = dy / d;
        }

        return {fx: dx, fy: dy};
    }
}

class UserController implements Controller {
    private game: Game;
    private ball: Ball; //TODO
    constructor(game: Game) {
        this.game = game;
    }
    reset(): void {
    }
    fetch(dt: number): { fx: number; fy: number } {
        this.ball = this.game.balls[0];
        let rad = Math.hypot(this.ball.x, this.ball.y);
        let dirx = this.ball.x / rad;
        let diry = this.ball.y / rad;
        let vcenter = this.ball.vx * dirx + this.ball.vy * diry;
        if (vcenter > 0) {
            if (rad + vcenter * vcenter / 2 / ACC * 1.5 > 5) {
                console.log("alert!");
            }
        }


        let gamepads = navigator.getGamepads();
        let gamepad = gamepads[0];
        if (gamepad) {
            let dx = gamepad.axes[0];
            let dy = gamepad.axes[1];
            let moveLen = Math.hypot(dx, dy);
            if (moveLen > 0.1) {
                if (moveLen > 1) {
                    dx = dx / moveLen;
                    dy = dy / moveLen;
                }
                let back = dy;
                let right = dx;
                let x = Math.cos(this.game.cameraAlpha) * back + Math.sin(this.game.cameraAlpha) * right;
                let y = Math.sin(this.game.cameraAlpha) * back + -Math.cos(this.game.cameraAlpha) * right;
                return {fx: x, fy: y};
            }
        }

        return {fx: 0, fy: 0};
    }
}

export class Game {

    private readonly textureEarth = textureLoader.load("resource/EarthView.jpg");
    private readonly texture8Ball = textureLoader.load("resource/8Ball.png");

    private scene: Scene;
    cameraAlpha: number;
    cameraBeta: number;
    balls: Ball[];

    constructor(scene: Scene) {
        this.scene = scene;
        this.balls = [];
        this.createUserBall(0, 0);
        this.createAiBall(3, 3);
        this.createAiBall(3, 0);
        this.createAiBall(3, -3);
        this.createAiBall(0, -3);
        this.createAiBall(0, 3);
        this.createAiBall(-3, 3);
        this.createAiBall(-3, 0);
        this.createAiBall(-3, -3);
    }
    private createUserBall(x: number, y: number) {
        let ball = new Ball(x, y, this.texture8Ball);
        ball.follow = true;
        this.scene.add(ball.sphere);
        ball.setController(new UserController(this));
        this.balls.push(ball);
    }
    private createAiBall(x: number, y: number) {
        let ball = new Ball(x, y, this.textureEarth);
        this.scene.add(ball.sphere);
        ball.setController(new AiController(ball, this));
        this.balls.push(ball);
    }

    spawn() {
        for (let ball of this.balls) {
            ball.reset();
        }

        this.cameraAlpha = Math.PI * 0.7;
        this.cameraBeta = Math.PI / 6;
    }

    update(dt: number) {
        let balls = this.balls.filter(ball => ball.alive);

        balls.forEach(ball => {
            ball.updateForce(dt);
            ball.updatePosRot(dt);
        });

        for (let i = 0; i < balls.length; i++) {
            let a = balls[i];
            for (let j = i + 1; j < balls.length; j++) {
                let b = balls[j];
                Game.testCollision(a, b);
            }
        }

        for (let ball of balls) {
            if (Math.hypot(ball.x, ball.y) > 5) {
                ball.alive = false;
                if (ball.follow) {
                    alert("you lose");
                    setTimeout(() => this.spawn(), 0);
                }
            }
        }

        let currentAlive = this.balls.filter(ball => ball.alive);
        if (currentAlive.length === 1 && currentAlive[0].follow) {
            alert("you win");
            setTimeout(() => this.spawn(), 0);
        }

        balls.forEach(ball => {
            ball.updateSphere();
        });
    }

    updateCamera(camera: Camera, dt: number) {
        let gamepads = navigator.getGamepads();
        let gamepad = gamepads[0];
        if (gamepad) {
            let da = gamepad.axes[2];
            let db = gamepad.axes[3];
            let rotLen = Math.hypot(da, db);
            if (rotLen > 0.1) {
                if (rotLen > 1) {
                    da = da / rotLen;
                    db = db / rotLen;
                }

                let speed = 3.0;
                let amount = speed * dt;
                this.cameraAlpha += da * amount;
                this.cameraBeta += db * amount;
                this.cameraAlpha = this.cameraAlpha % (Math.PI * 2);
                this.cameraBeta = Math.min(Math.PI * 0.48, Math.max(this.cameraBeta, 0));
            }
        }

        this.balls.forEach(ball => {
            if (ball.follow) {
                let sphere = ball.sphere;
                const distance = 5;
                let cx = sphere.position.x + distance * Math.cos(this.cameraBeta) * Math.cos(this.cameraAlpha);
                let cy = sphere.position.y + distance * Math.sin(this.cameraBeta);
                let cz = sphere.position.z + distance * Math.cos(this.cameraBeta) * Math.sin(this.cameraAlpha);
                camera.position.set(cx, cy, cz);
                camera.lookAt(sphere.position);
            }
        });
    }

    private static testCollision(a: Ball, b: Ball) {
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        if (distance >= 1) return;

        let dirx = dx / distance;
        let diry = dy / distance;
        let centerX = (a.x + b.x) * 0.5;
        let centerY = (a.y + b.y) * 0.5;
        a.x = centerX - dirx * 0.5;
        a.y = centerY - diry * 0.5;
        b.x = centerX + dirx * 0.5;
        b.y = centerY + diry * 0.5;

        let a_vdir = a.vx * dirx + a.vy * diry;
        let b_vdir = b.vx * dirx + b.vy * diry;
        let a_vdir_xy = {x: dirx * a_vdir, y: diry * a_vdir};
        let b_vdir_xy = {x: dirx * b_vdir, y: diry * b_vdir};
        let a_vnor_xy = {x: a.vx - a_vdir_xy.x, y: a.vy - a_vdir_xy.y};
        let b_vnor_xy = {x: b.vx - b_vdir_xy.x, y: b.vy - b_vdir_xy.y};

        a.vx = a_vnor_xy.x + b_vdir_xy.x;
        a.vy = a_vnor_xy.y + b_vdir_xy.y;
        b.vx = b_vnor_xy.x + a_vdir_xy.x;
        b.vy = b_vnor_xy.y + a_vdir_xy.y;
    }


}
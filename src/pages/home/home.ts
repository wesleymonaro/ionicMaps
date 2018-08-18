import { Component } from '@angular/core';
import mapboxgl from 'mapbox-gl/dist/mapbox-gl.js'
import { NavController, ViewController, PopoverController, NavParams, LoadingController, ToastController } from 'ionic-angular';
import { Geolocation } from '@ionic-native/geolocation';
import * as firebase from 'firebase';
import _ from 'lodash';
import axios from 'axios';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
  providers: [Geolocation]
})
export class HomePage {
  Coordinates: any;
  watch: any;
  lat = -23.541047;
  lng = -46.211379;
  users = [];

  constructor(
    public navCtrl: NavController,
    private geolocation: Geolocation,
    public popover: PopoverController,
  ) {

  }

  ionViewDidEnter() {
    console.clear();
    this.geolocation.getCurrentPosition().then((resp) => {
      this.lat = resp.coords.latitude;
      this.lng = resp.coords.longitude;

      firebase.initializeApp({
        apiKey: 'AIzaSyDyC1VJhxRSkmeRlkTtnWQ8ts2eONDauWI',
        authDomain: 'palestra-maps.firebaseapp.com',
        databaseURL: 'https://palestra-maps.firebaseio.com',
        projectId: 'palestra-maps',
        storageBucket: 'palestra-maps.appspot.com',
        messagingSenderId: '313832450262',
      });

      firebase.database().ref('users').on('value', (snap) => {
        const users = _.toArray(snap.val());
        this.users = users;
        console.log(this.users);
        this.executemap();
      });


    }).catch((error) => {
      console.log('Error getting location', error);
    });

  }




  executemap() {

    mapboxgl.accessToken = 'pk.eyJ1Ijoid2VzbGV5bW9uYXJvIiwiYSI6ImNqa2RhbWw0YzBoeHUzd3FtcHZpaTY4bjIifQ.lYSOeUucWfHFNpxXhwEIaA';
    var map = new mapboxgl.Map({
      style: 'mapbox://styles/mapbox/streets-v9',
      center: [this.lng, this.lat],
      zoom: 12,
      container: 'map',

    });

    map.on('load', () => {
      this.users.map(user => {
        map.loadImage(user.avatar, (error, image) => {
          if (error) throw error;
          map.addImage(user.avatar, image);
          map.addLayer({
            "id": user.login,
            "type": "symbol",
            'interactive': true,
            'circle-radius': 6,
            "source": {
              "type": "geojson",
              "data": {
                "type": "FeatureCollection",
                "features": [{
                  "type": "Feature",
                  "geometry": {
                    "type": "Point",
                    "coordinates": [user.coordinates.lat, user.coordinates.lon]
                  },
                  "properties": {
                    "title": user.login,
                    "icon": user.avatar,
                    "description": `<strong>${user.name}</strong><p>${user.bio}</p>`,

                  }
                }]
              }
            },
            "layout": {
              "icon-image": user.avatar,
              "icon-size": 0.05,
              "text-field": user.login,
              "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
              "text-offset": [0, 0.6],
              "text-anchor": "top"
            }
          });
        })
      })

    });

    map.on('click', (e) => {
      //alert(e.lngLat);
      this.popover.create(ModalUserPage, { coordinates: e.lngLat, users: this.users }).present();
    });

  }

}


@Component({
  templateUrl: 'modal.html',
  selector: 'modal-page',
  providers: []
})

export class ModalUserPage {

  coordinates: any = {};
  users = [];
  username: '';
  loading
  error: any;

  constructor(public viewCtrl: ViewController, public navParams: NavParams, public loadingCtrl: LoadingController, public toastCtrl: ToastController) {
    this.coordinates = navParams.data.coordinates;
    this.users = navParams.data.users;
    console.log(this.coordinates);
  }

  close() {
    this.viewCtrl.dismiss();
  }

  async save() {
    try {
      this.loading = this.loadingCtrl.create({ content: 'Carregando...' });
      this.loading.present();

      const result = await axios.get(`https://api.github.com/users/${this.username}`);
      let userData = result.data;

      const newUser = {
        login: userData.login,
        name: userData.name,
        bio: userData.bio,
        avatar: userData.avatar_url,
        coordinates: {
          lat: this.coordinates.lng,
          lon: this.coordinates.lat,
        },
      };

      if (this.users.find(user => user.login === newUser.login)) {
        this.toastCtrl.create({ message: 'Usuário duplicado', duration: 3000 }).present();
        this.loading.dismiss();
      } else {
        firebase.database().ref('users').child(newUser.login).set(newUser);
        this.toastCtrl.create({ message: 'Usuário adicionado', duration: 3000 }).present();
        this.loading.dismiss();
        this.close();
      }

    } catch (error) {
      console.log(error);
      this.toastCtrl.create({ message: 'Usuário não existe', duration: 3000 }).present();
      this.loading.dismiss();
    }
  }
}

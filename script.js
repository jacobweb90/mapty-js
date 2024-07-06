'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

////////////////////////////////////// Workout Classess /////////////////////////////////

////// Parent Class //////
class Workout {
  date = new Date(); // Date that the workout object created
  id = (Date.now() + '').slice(-10); // ID based on the last 10 digits of the date
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    //prettier - ignore
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

////// Child Class //////

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace(); // simply call the method here so that the method will be called
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace; // just simply return this method, in case we need the code
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    //km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const run1 = new Running([39, -12], 5.2, 24, 178);
const cyc1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cyc1);

//////////////////////////// Application Architecture /////////////////////////////////

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // To trigger Geolocation API
    this._getPosition();
    // Get data from local storage
    this._getLocalStorage();
    // Submit workout with "Enter"
    form.addEventListener('submit', this._newWorkout.bind(this));
    // Toggle in between Cycling & Running
    inputType.addEventListener('change', this._toggleElevationField);
    // Move the map to the clicked workout
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords; //const latitude = position.coords.latitude
    const { longitude } = position.coords;
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    // Leaflet library
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel); // 13 is the zoom in zoom out ratio

    // openstreetmap is default map for Leaflet
    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks from map
    this.#map.on('click', this._showForm.bind(this));

    // ADD .on() coming from the Leaflet library, instead of standard eventListener, we are using this .on() from the L, because if embedded eventListener on the map, we would not know the exact location of the click

    // Render the local storage data marker on the map
    this.#workouts.forEach(work => {
      this._renderWorkOutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    // Display the form
    form.classList.remove('hidden');
    // Put a cursor on the 'distance' input box
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        ' ';
    form.style.display = 'none';
    //add hidden class back on
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    // Checking 'Number types'
    const validInputs = (
      ...inputs // REST method returns array
    ) => inputs.every(inp => Number.isFinite(inp));
    // loop over the array and check, .every() only returns true when all of them are true

    // Checking 'Positive' value
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value; // both input either running or cycling
    const distance = +inputDistance.value; // convert into number by adding "+"
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if the data is valid with guardclause, check the oppositve
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      // Check if the data is valid
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkOutMarker(workout);

    // Render workout on the list
    this._renderWorkOut(workout);

    // Hide the form & Clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkOutMarker(workout) {
    // L.marker creates the marker
    // .addTo(map) add the marker to the map
    // .bindPopup(), create a marker and bind it to the pop up
    // Refer leaflet library documentation for the L.pop()
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          // CSS styling
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkOut(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title"> ${workout.description} </h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (workout.type === 'running')
      html += `
         <div class="workout__details">
           <span class="workout__icon">⚡️</span>
           <span class="workout__value">${workout.pace.toFixed(1)}</span> 
           <span class="workout__unit">min/km</span>
         </div>
         <div class="workout__details">
           <span class="workout__icon">🦶🏼</span>
           <span class="workout__value">${workout.cadence}</span>
           <span class="workout__unit">spm</span>
         </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
       <div class="workout__details">
         <span class="workout__icon">⚡️</span>
         <span class="workout__value">${workout.speed.toFixed(1)}</span>
         <span class="workout__unit">km/h</span>
       </div>
       <div class="workout__details">
         <span class="workout__icon">⛰</span>
         <span class="workout__value">${workout.elevationGain}</span>
         <span class="workout__unit">m</span>
       </div>
      </li>`;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    console.log(workoutEl);

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    // Move the map to the coordination
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        // duration of animation
        duration: 1,
      },
    });

    // Usingthe public interface
    //workout.click();
  }

  // Setting all the workouts to local storage
  _setLocalStorage() {
    // LocalStorage : key value stores ('Key', 'strings')
    // JSON.stringify convert object into strings
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);

    if (!data) return;

    // Initial workouts is an empty array, so push the local storage data into the array
    this.#workouts = data;
    // Render the workouts to the list
    this.#workouts.forEach(work => this._renderWorkOut(work));
  }

  // Delete workouts at once on local storage
  reset() {
    localStorage.removeItem('workouts');
    location.reload(); //reload page programmatically , and the application is empty
  }
}

const app = new App();

/////////////////////////// Using Geolocation API ////////////////////////////

// In general many browser API we can use
/// like the previous internationalisation, timer, camera access, phone vibrate

// 2 callback functions needed
/// first: successful function, when the browser successfully get the location
/// Second: error callback, when the browser failed to obtain the location

/// To avoid error on old browser

///////////// Rendering workout input form whenever user click on the map //////////////

//////////////////////////// Displaying a Map Marker ////////////////////////////////

//////////// Displaying a Map Using Leaflet Library (3rd party script) ////////////////

// Using 3rd party script, Then load the map and display the map on the user interface

// Leaflet library available online, copy the html code and pasted it to the head of HTML code before our own script, because when the HTML loading our own script , the browser must have downloaded the leaftlet library. (HTML file, line 8 onward)

// Any variable that is global in any scrip will be available to other script, and the scrip order does matter, if Leaflet.js appear before script.js, then Leaflet.js cannot access the global variables of script.js because Leaftlet.js appear before script.js

//////////////////////////// Displaying a Map Marker ////////////////////////////////

// Bind an eventListener so that everytime the user click on the map , we will display a marker in the map

// Line 46 : adding .on() from Leaftlet library to the const = map created, then extract the lat , lng from the map properties latlng

///////////// Rendering workout input form whenever user click on the map //////////////

// Using the form that selected with querySelector above, then DOM manipulation to remove the 'hidden'

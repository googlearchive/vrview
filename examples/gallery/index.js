var vrView;
var imageBase = 'examples/gallery/';

// All the scenes for the experience
var scenes = {
  petra: {
    image: imageBase + 'petra.jpg',
    preview: imageBase + 'petra-preview.jpg'
  },
  christTheRedeemer: {
    image: imageBase + 'christ-redeemer.jpg',
    preview: imageBase + 'christ-redeemer-preview.jpg'
  },
  machuPicchu: {
    image: imageBase + 'machu-picchu.jpg',
    preview: imageBase + 'machu-picchu-preview.jpg'
  },
  chichenItza: {
    image: imageBase + 'chichen-itza.jpg',
    preview: imageBase + 'chichen-itza-preview.jpg'
  },
  tajMahal: {
    image: imageBase + 'taj-mahal.jpg',
    preview: imageBase + 'taj-mahal-preview.jpg'
  },
};

function onLoad() {
  vrView = new VRView.Player('#vrview', {
    width: '100%',
    height: 480,
    image: 'examples/gallery/blank.png',
    is_stereo: false,
    is_autopan_off: true
  });

  vrView.on('ready', onVRViewReady);
  vrView.on('modechange', onModeChange);
  vrView.on('error', onVRViewError);
}

function loadScene(id) {
  console.log('loadScene', id);

  // Set the image
  vrView.setContent({
    image: scenes[id].image,
    preview: scenes[id].preview,
    is_autopan_off: true
  });

  // Unhighlight carousel items
  var carouselLinks = document.querySelectorAll('ul.carousel li a');
  for (var i = 0; i < carouselLinks.length; i++) {
    carouselLinks[i].classList.remove('current');
  }

  // Highlight current carousel item
  document.querySelector('ul.carousel li a[href="#' + id + '"]')
      .classList.add('current');
}

function onVRViewReady(e) {
  console.log('onVRViewReady');

  // Create the carousel links
  var carouselItems = document.querySelectorAll('ul.carousel li a');
  for (var i = 0; i < carouselItems.length; i++) {
    var item = carouselItems[i];
    item.disabled = false;

    item.addEventListener('click', function(event) {
      event.preventDefault();
      loadScene(event.target.parentNode.getAttribute('href').substring(1));
    });
  }

  loadScene('petra');
}

function onModeChange(e) {
  console.log('onModeChange', e.mode);
}

function onVRViewError(e) {
  console.log('Error! %s', e.message);
}

window.addEventListener('load', onLoad);
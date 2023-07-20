//-------DOM ELEMENTS-------

const file = document.getElementById('file')
const loader = document.getElementById("loader");
const take_attendance = document.getElementById("take_attendance");

//------Loading the Face Recognition Models from Directory-------

Promise.all([
  faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
  faceapi.nets.ssdMobilenetv1.loadFromUri('./models'),
  faceapi.nets.faceExpressionNet.loadFromUri('./models')

]).then(start)


//------Defining Global Variables---------

let globalnames = []
let date = ""
let globalexpressions = []
let excel_dates = [new Date().toLocaleString()]


//-------Async function to be executed after the models have finished loading----------- 

async function start() {
  const container = document.createElement('div')
  container.style.position = 'relative'
  document.body.append(container)
  //calling the function to train the model using the images in labeled_images3 directory
  const labeledFaceDescriptors = await loadLabeledImages()  
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6)
  let image
  let canvas
  Loading.innerText = "Models Loaded";
  loader.remove();
  
  //Function to be executed when the Choose File Button is clicked
  file.addEventListener('change', async () => {
    if (image) image.remove()
    if (canvas) canvas.remove()
    var branch = document.getElementById("branch").value;
    var semester = document.getElementById("semester").value;
    
    image = await faceapi.bufferToImage(file.files[0])
    image.style.width = '75%' //resizing uploaded image
    image.classList.add('center') //centering uploaded image
    container.append(image)
    canvas = faceapi.createCanvasFromMedia(image) //creating canvas from image to draw boxes on faces that have been recognized
    canvas.style = "position: absolute; top: 0px; left: 0px; right: 0px; bottom: 0px; margin: auto;"
    container.append(canvas)
    const displaySize = { width: image.width, height: image.height }
    faceapi.matchDimensions(canvas, displaySize)
    //Detecting faces with expressions in the image
    const detections = await faceapi.detectAllFaces(image).withFaceLandmarks().withFaceDescriptors().withFaceExpressions()
    const resizedDetections = faceapi.resizeResults(detections, displaySize)

    //-----Matching the detected faces with the faces in labeled_images3 directory-------

    const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor))
    results.forEach((result, i) => {
      const box = resizedDetections[i].detection.box
      const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() })
      const minProbability = 0.5
      //Function to draw facial expressions
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections, minProbability) 
      const names = result.toString().replace(/[0-9(.)]/g, '');
      //const confidence = result.toString().replace(/[^0-9\.]+/g, '');
      globalnames.push(names)
      drawBox.draw(canvas)
      detections_array = detections
      let funcdate = new Date().toLocaleString(); //finding current date and time
      date = branch + " " + semester + " " + funcdate + ".xlsx"; //excel file name
    })

    //for loop to populate the globalexpressions array with the expressions recognized from the faces
    for(i=0; i<globalnames.length; i++){
      let all_expressions = detections_array[i]['expressions']
      console.log(detections_array);
      let detected_expression = Object.keys(all_expressions).reduce(function(a, b){ return all_expressions[a] > all_expressions[b] ? a : b });
      globalexpressions.push(detected_expression)
    }
    
  })
}
//-----Function to train the model using the images of individual students--------
function loadLabeledImages() {
  const labels = ['Aman', 'Kartik', 'Mohit', 'Priya', 'Shalini','Zaid', 'Zoya'] //this array contains the name of all students
  return Promise.all(
    labels.map(async label => {
      const descriptions = []
      for (let i = 1; i <= 3; i++) {
        const img = await faceapi.fetchImage(`./labeled_images3/${label}/${i}.jpeg`)
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
        descriptions.push(detections.descriptor)
      }
      return new faceapi.LabeledFaceDescriptors(label, descriptions)
    })
  )
}

//----------Function to be executed when the Download XLSX button is clicked-----------

$("#take_attendance").click(function(){
  var wb = XLSX.utils.book_new();
  wb.SheetNames.push("Test Sheet");  //Name of worksheet
  var ws_data = [excel_dates,globalnames,globalexpressions];
  var ws = XLSX.utils.aoa_to_sheet(ws_data);  //Populating the excel sheet
  ws['!cols'] = fitToColumn(ws_data);

  //-----Function to set the column width of excel file---------
  function fitToColumn(ws_data) {
    // get maximum character of each column
    return ws_data[0].map((a, i) => ({ wch: Math.max(...ws_data.map(a2 => a2[i] ? a2[i].toString().length : 0)) }));
  }
  
  wb.Sheets["Test Sheet"] = ws;
  var wbout = XLSX.write(wb, {bookType:'xlsx',  type: 'binary'});

  function s2ab(s) {
    var buf = new ArrayBuffer(s.length);
    var view = new Uint8Array(buf);
    for (var i=0; i<s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
    return buf;
  }
  saveAs(new Blob([s2ab(wbout)],{type:"application/octet-stream"}), date);  //Save the excel file with name
});
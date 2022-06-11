import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import io from 'socket.io-client';
import Messages from './Messages';
import MessageInput from './MessageInput';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GoogleLogin } from '@react-oauth/google';


const handleLogin = async googleData => {
  console.log("googleData:", googleData);
  if (googleData.error === "popup_closed_by_user"){
    console.log("login popup closed prematurely!");
    return;
  }

  const res = await fetch("/api/store_id_token", {
    method: "POST",
    body: JSON.stringify({
      token: googleData.credential
    }),
    headers: {
      "Content-Type": "application/json"
    }
  });

  const data = await res.json();
  // store returned user somehow
  console.log(data);

  window.location.reload();
}


async function performLogout(){
  const res = await fetch("/api/google-logout", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    }
  });

  const data = await res.json();
  console.log(data);
  window.location.reload();
}

async function identifyCurrentUser(){
  const res = await fetch("/api/me", {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  const data = await res.json();
  console.log(data);
  return data;
}



function MessagingApp() {

  const [data, setData] = React.useState(null);
  const [name, setName] = useState(null);

  const [socket, setSocket] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesStartRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }
  const scrollToTop = () => { // will use this when i have arrow buttons that always are on the screen to allow users to scroll to the top or the bottom
    messagesStartRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom();
  }, [data]);

  useEffect(() => { // making an api call to see who is currently logged in
    fetch("/api/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.message === "No user logged in!"){
            setData("");
          }
          else{
            setData(data);
            setName(data.name);
          }
          console.log("data from call inside app:", data);
        });

  }, []);


  useEffect(() => {
    // const newSocket = io(`https://${window.location.hostname}`); // CHANGE TO THIS LINE FOR HEROKU
    const newSocket = io(`http://${window.location.hostname}:6005`); // FOR LOCAL
    setSocket(newSocket);
    return () => newSocket.close();
  }, [setSocket, name]);

  return (
    <main>
      <div id="target-div-top" ref={messagesStartRef}></div>
      <div id="top-part" >
        <h1>Messaging App</h1>
        <p>My goal is to make this a real-time messaging app.</p>
      </div>

      <div className="App">
        <div id="loginStuff">
          {
            data ? (
                <div>
                  <div id="upperLogin">
                    <h2>Welcome back, {data.name}!</h2>
                    <h3>You're logged in as {data.email}</h3>
                  </div>
                  <div id="lowerLogin">
                    <img src={data.picture} alt={"new"} referrerPolicy={"no-referrer"}/>

                    <button onClick={performLogout}>
                      Log Out
                    </button>
                    {/* <button onClick={identifyCurrentUser}>
                      Current User
                    </button> */}
                  </div>
                </div>
            ) : (
              <GoogleOAuthProvider clientId={import.meta.env.VITE_MESSAGINGAPP_CLIENT_ID}>
                <GoogleLogin
                  onSuccess={handleLogin}
                  onError={handleLogin}
                  // useOneTap
                />
              </GoogleOAuthProvider>
            
            )
          }

        </div>

        { socket ? (
          <div className="chat-container">
            <Messages socket={socket}/>
            <MessageInput socket={socket}/>
          </div>
        ) : (
          <div>Not Connected</div>
        )}
        <div id="target-div-bottom" ref={messagesEndRef}></div>
      </div>
    </main>
  )

}

function ImageDisplayApp(){
  return (
  <div className="App">
    <img src={"src/favicon.svg"}/>
  </div>
  )
}


function FileStorageApp() {

  const [data, setData] = React.useState(null);
  const [name, setName] = useState(null);

  const [selectedFile, setSelectedFile] = useState({name: "No file chosen"});
	const [isFilePicked, setIsFilePicked] = useState(false);

	const changeHandler = (event) => {
    if (event.target.files[0] != undefined) {
      if (event.target.files[0].size > 8000000){
        alert("Please pick a file smaller than 8 MB :(");
        setIsFilePicked(false);
        setSelectedFile({name: "No file chosen"});
      }
      else{
        setIsFilePicked(true);
        setSelectedFile(event.target.files[0]);
      }
    }
    else{
      setSelectedFile({name: "No file chosen"});
      setIsFilePicked(false);
    }
	};

  const uploadFile = () => {
    console.log("File about to be uploaded!");
    console.log(selectedFile);

    // let postObj = {fileName: selectedFile.name, selectedFile: selectedFile};

    const formData = new FormData();

		formData.append('file', selectedFile);
    // formData.append("name", selectedFile.name);

    let params = {
      method: "POST",
      body: formData,
      // headers: {
      //   "Content-Type": "multipart/form-data"
      // }
    };

    fetch("/api/uploadFile", params)
        // .then((res) => res.json())
        .then((data) => {
          console.log("data from call inside app:", data);
        });
  };  


  useEffect(() => { // making an api call to see who is currently logged in
    fetch("/api/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.message === "No user logged in!"){
            setData("");
          }
          else{
            setData(data);
            setName(data.name);
          }
          console.log("data from call inside app:", data);
        });

  }, []);



  return (
    <main>
      <div id="top-part" >
        <h1>File Upload App</h1>
      </div>

      <div className="App">
        <div id="loginStuff">
          {
            4 < 5 ? (
            // data ? (
                <div id="loggedInContainer">
                  <div id="upperLogin">
                    {/* <h2>Welcome back, {data.name}!</h2>
                    <h3>You're logged in as {data.email}</h3> */}
                  </div>
                  <div id="lowerLogin">
                    {/* <img src={data.picture} alt={"new"} referrerPolicy={"no-referrer"}/> */}

                    <button onClick={performLogout}>
                      Log Out
                    </button>

                  </div>
                  <div id="fileUploadContainer">
                    <h3>Please upload a .txt file less than 8 MB in size:</h3>
                    <div style={{ display: 'flex', flexDirection: "column", justifyContent: 'flex-start', alignItems: 'center'}}>
                      <input type="file" accept=".txt, .pdf, .jpg" name="file" onChange={changeHandler}/>
                      <p style={{fontSize: "14px"}}>{selectedFile.name}</p>
                    </div>
                    { isFilePicked ? <button onClick={uploadFile}>Upload File</button> : []}
                  </div>
                </div>
            ) : (
              <GoogleOAuthProvider clientId={import.meta.env.VITE_MESSAGINGAPP_CLIENT_ID}>
                <GoogleLogin
                  onSuccess={handleLogin}
                  onError={handleLogin}
                  // useOneTap
                />
              </GoogleOAuthProvider>
            
            )
          }

        </div>
      </div>
    </main>
  )

}


function App(){

  return (
    <div>
      <FileStorageApp/>
      {/* <MessagingApp/> */}
    </div>
  )
    
}

export default App;




// function App(){ // APP WITH THE TWO ALTERABLE BUTTON CLICK STATES

//   const [a, setA] = useState(14);
//   const [b, setB] = useState(5);

//   function clickedButton1(){
//     console.log("Clicked button!");
//     setA(4);
//   }

//   function clickedButton2(){
//     console.log("Clicked button!");
//     setA(14);
//   }
    
//   if (a > b){
//     return (
//       <div>
//         <input type="button" value="Click me" onClick={clickedButton1}/>
//         <MessagingApp/>
//       </div>
//     )
//   }
//   else {
//     return (
//       <div>
//         <input type="button" value="Click me" onClick={clickedButton2}/>
//         <ImageDisplayApp/>
//       </div>
//     )
//   }
    
// }

// export default App;
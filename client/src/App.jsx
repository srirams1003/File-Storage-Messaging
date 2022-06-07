import React, { useEffect, useState } from 'react';
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



function App() {

  const [data, setData] = React.useState(null);
  const [name, setName] = useState(null);

  React.useEffect(() => { // making an api call to see who is currently logged in
    fetch("/api/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.message === "No user logged in!"){
            setData(null);
          }
          else{
            setData(data);
            setName(data.name);
          }
          console.log("data from call inside app:", data);
        });

  }, []);
  
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(`https://${window.location.hostname}`); // CHANGE TO THIS LINE FOR HEROKU
    // const newSocket = io(`http://${window.location.hostname}:6005`); // FOR LOCAL
    setSocket(newSocket);
    return () => newSocket.close();
  }, [setSocket, name]);

  return (
    <main>
      <div id="top-part">
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
                  useOneTap
                />
              </GoogleOAuthProvider>
            
            )
          }

        </div>

        { socket ? (
          <div className="chat-container">
            <Messages socket={socket}/>
            <MessageInput socket={socket} />
          </div>
        ) : (
          <div>Not Connected</div>
        )}
      </div>
    </main>
  )

}

export default App;
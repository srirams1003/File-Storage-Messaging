import React, { useState } from 'react';
import './MessageInput.css';

const NewMessage = ({socket}) => {
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
        });

  }, []);


  const [value, setValue] = useState('');
  const submitForm = (e) => {
    e.preventDefault();
    // console.log("Value:", value);
    socket.emit('message', [name, value]);
    setValue('');
  };

  return (
    <form onSubmit={submitForm}>
      <input
        autoFocus
        value={value}
        placeholder="Type your message"
        onChange={(e) => {
          setValue(e.currentTarget.value);
        }}
      />
    </form>
  );
};

export default NewMessage;
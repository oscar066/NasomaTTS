// import TextToSpeechConverter from "../components/dashboard/TextToSpeechConverter";
// import RecentConversions from "../components/dashboard/RecentConversions";
// import Dashboard from "../components/Dashboard/Dashboard";
import React from "react";
import DocumentReader from "../components/TTS/documentReader2";

const DashBoard = () => {
  return (
    <div className='pt-8'> 
      <DocumentReader />
    </div>
  );
};

export default DashBoard;

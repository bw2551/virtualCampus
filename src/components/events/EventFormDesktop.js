import React, { useCallback } from "react";
import { CircularProgress } from '@material-ui/core';
import "./test.css";
//form settings
import * as Yup from "yup";
//inputs
import { Formik, Form, Field } from "formik"
import FormTitle from "../form-components/FormTitle"
import RequiredFields from "../form-components/RequiredFields"
import AdvancedFields from "../form-components/AdvancedFields"
import SubmitButton from '../form-components/SubmitButton'
import ExpansionPanel from "@material-ui/core/ExpansionPanel";
import ExpansionPanelDetails from "@material-ui/core/ExpansionPanelDetails";
import ExpansionPanelSummary from "@material-ui/core/ExpansionPanelSummary";

//Date and time input
import { MuiPickersUtilsProvider } from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";

// utils
import Button from "@material-ui/core/Button";
import Grid from '@material-ui/core/Grid';
import {
  CustomHeader,
  Template,
  getOffset,
  convertDateToUTC,
  convertTimestampToDate, convertUTCToLocal
} from "..";
import EventCardDesktop from '../cards/eventCardsFeaturedAndCards/EventCardDesktop'
import Container from "@material-ui/core/Container";
// backend
import * as firebase from "firebase";
import Axios from "axios";
import TZ from "countries-and-timezones";
import { CheckboxWithLabel } from "formik-material-ui";
import CustomFooter from "../all/CustomFooter";

// set an init value first so the input is "controlled" by default
const initVal = {
  name: "",
  email: "",
  title: "",
  // desc: "",
  other_tags: "",
  image_file: "",
  image_link: "",
  start_date: "",
  end_date: "",
  timezone: "",
  attendants: 10,
  recurring: "",
  entry_link: "",
  invite_link: "",
  link_type: "",
  comments: "",
  tag: "",
  activism_tag: "",
  covid_tag: "",
  education_tag: "",
  freshman_tag: "",
  social_tag: "",
  agree: ""

};

// here you can add make custom requirements for specific input fields
// you can add multiple rules as seen with the "name" scheme
// you can also add custom feedback messages in the parameters of each error function
const validationSchema = Yup.object().shape({
  name: Yup.string()
      .min(5, "Too Short")
      .required("Required"),
  email: Yup.string()
      .email("Please enter a valid email address")
      .required("Required"),
  title: Yup.string()
      .required("Required"),
  // desc: Yup.string()
  //   .required("Required")
  //   .max("600", "Please less than 600 characters"),
  start_date: Yup.string()
      .required("Required"),
  end_date: Yup.string()
      .required("Required"),
  timezone: Yup.string()
      .required("Required"),
  attendants: Yup.number()
      // .required("Required")
      .integer("Please enter an integer"),
  agree: Yup.boolean("True")
      .required(),
  image_link: Yup.string()
      .trim().matches(/(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|png)/, 'Enter valid image url (Ends with .jpg, .png)'),
  invite_link: Yup.string()
      // .required()
      .url("Please enter a valid URL"),
  // link_type: Yup.string()
});

let getCurrentLocationForTimeZone = function () {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

const TITLE = "ADD EVENT";
const defaultTimezone = "America/New_York";


function formatEmailText(jsonText) {
  var newText = "";
  Object.keys(jsonText).map((key, index) => (
      newText = newText + "\n<br>" + getText(key, jsonText[key])
  ));
  return newText;
}

function getText(key, val) {
  key = key.replace("_", " ");
  if (val !== undefined && val !== "")
    return key + ": " + val;
  return key + ": not provided";
}

function processATag(values, key, defKey) {

  if (key.endsWith("_tag") && key !== defKey && values[key] !== "") {
    if (values[key] == true) {
      values[defKey] = values[defKey] + key.replace("_tag", "") + ";";
    }
  }

  return values[defKey];
}

function cleanTag(values, key) {
  if (key.endsWith("_tag")) {
    delete values[key];
  }
  return values;
}

function processTags(values) {

  const defKey = "other_tags";
  if (defKey in values === false)
    return values;

  // Because we want commas and semicolons to be separated upon, let's make them equivalent:
  console.log(values[defKey])
  values[defKey] = values[defKey].split(",").join(";")
  console.log("after: " + values[defKey])

  if (values[defKey].endsWith(";") === false && values[defKey] !== "") {
    values[defKey] = values[defKey] + ";";
  }

  Object.keys(values).map((key, index) => (
      values[defKey] = processATag(values, key, defKey),
          values = cleanTag(values, key)
  ));
  values[defKey] = values[defKey].split("; ;").join(";");
  values[defKey] = values[defKey].split(";;").join(";");
  if (values[defKey].endsWith(";")) {
    values[defKey] = values[defKey].substring(0, values[defKey].length - 1);
  }
  values["tags"] = values[defKey].split(";");
  delete values["tag"];
  delete values[defKey];
  return values;

}


function sendZoomEmail(id, name, from) {

  const emailData = {
    from: from,
    subject: "ZOOMLINK: " + name + ". ID: " + id,
    text: "Event " + name + " needs a zoom link!"
  };

  Axios.post("https://us-central1-columbia-virtual-campus.cloudfunctions.net/sendEmail", emailData)
      .then(res => {
        console.log("Success");
      })
      .catch(error => {
        console.log("error");
      });
}

let dst = function (loc = getCurrentLocationForTimeZone()) {

  // If user selects EST time:
  if (loc === "America/New_York") {
    const today = new Date();
    var DSTDateStart;
    var DSTDateEnd;
    switch (today.getFullYear()) {
      case 2020:
        DSTDateStart = new Date(Date.UTC(2020, 2, 8, 7));
        DSTDateEnd = new Date(Date.UTC(2020, 10, 1, 6));
        break;
      case 2021:
        DSTDateStart = new Date(Date.UTC(2021, 2, 14, 7));
        DSTDateEnd = new Date(Date.UTC(2021, 10, 7, 6));
        break;
      case 2022:
        DSTDateStart = new Date(Date.UTC(2022, 2, 13, 7));
        DSTDateEnd = new Date(Date.UTC(2022, 10, 6, 6));
        break;
    }
    if (today.getTime() >= DSTDateStart.getTime() && today.getTime() < DSTDateEnd.getTime()) {
      // console.log("true");
      return true;
    }
    // console.log("false");
    return false;
  }

  // If user selects local time:
  if (TZ.getTimezone(loc).utcOffset === TZ.getTimezone(loc).dstOffset) {
    return false;
  }
  const date = new Date();
  return date.getTimezoneOffset()
  // < Events.stdTimezoneOffset();
}

let getTimezoneName = function (loc = getCurrentLocationForTimeZone(), dstN = null) {
  if (!dstN) { dstN = dst() }
  const gmt = TZ.getTimezone(loc).utcOffsetStr;
  var str = "GMT" + gmt;

  if (gmt === "-01:00")
    return "CAT";
  if (gmt === "-02:00")
    return "BET";
  if (gmt === "-03:00")
    return "AGT";
  if (gmt === "-03:30")
    return "CNT";
  if (gmt === "-04:00")
    return "PRT";
  if (gmt === "-05:00")
    return dst ? "EDT" : "EST";
  if (gmt === "-06:00")
    return dst ? "CDT" : "CST";
  if (gmt === "-07:00")
    return dst ? "MDT" : "MST";
  if (gmt === "-08:00")
    return dst ? "PDT" : "PST";
  if (gmt === "-09:00")
    return dst ? "ADT" : "AST";
  if (gmt === "-10:00")
    return dst ? "HDT" : "HST";
  if (gmt === "-11:00")
    return "MIT";
  if (gmt === "+12:00")
    return dst ? "NDT" : "NST";
  if (gmt === "+11:00")
    return dst ? "SDT" : "SST";
  if (gmt === "+10:00")
    return "AET";
  if (gmt === "+09:30")
    return dst ? "ACDT" : "ACST";
  if (gmt === "+09:00")
    return dst ? "JDT" : "JST";
  if (gmt === "+08:00")
    return "CTT";
  if (gmt === "+07:00")
    return dst ? "VDT" : "VST";
  if (gmt === "+06:00")
    return dst ? "BDT" : "BST";
  if (gmt === "+05:30")
    return dst ? "IDT" : "IST";
  if (gmt === "+05:00")
    return "PLT";
  if (gmt === "+04:00")
    return "NET";
  if (gmt === "+03:30")
    return "MET";
  if (gmt === "+03:00")
    return "EAT";
  if (gmt === "+02:00")
    return "EET";
  if (gmt === "+01:00")
    return "ECT";

  if (dstN)
    return str + " DST";
  return str;
}

function getTimezoneOptions() {
  if (getCurrentLocationForTimeZone() != defaultTimezone) {
    return [
      {
        value: getCurrentLocationForTimeZone()
            + "$" + dst(),
        label: "Mine: "
            + getTimezoneName()
      },
      {
        value: defaultTimezone
            + "$" + dst(defaultTimezone),
        label: "Default: "
            + getTimezoneName(defaultTimezone
                , dst(defaultTimezone))
      }
    ];
  } else {
    return [
      {
        value: defaultTimezone
            + "$" + dst(defaultTimezone),
        label: "Mine: "
            + getTimezoneName(defaultTimezone
                , dst(defaultTimezone))
      }
    ];
  }
}

const optionsTZ = getTimezoneOptions();

let imgurLinkOutside = ""
const default_img = "https://i.imgur.com/GP66BiO.png"
let exampleEvent = {
  agree: true,
  approved: false,
  comments: "",
  desc: "CVC Example Description",
  email: "columbiavirtualcampus@gmail.com",
  end_date: "Sun Jul 05 2020 23:59:00 GMT-0400 (Eastern Daylight Time)",
  entry_link: "",
  event: "CVC Example",
  event_link: "http://columbiavirtualcampus.com",
  image_file: "",
  image_link: default_img,
  invite_link: "",
  name: "Columbia Virtual Campus",
  recurring: "",
  start_date: "Sat Jul 04 2020 23:59:00 GMT-0400 (Eastern Daylight Time)",
  tags: [],
  timezone: "America/New_York$true",
  title: "CVC Example"
}


function convertEventsTime(event) {
  const tzString = event.timezone;

  event.start_date = event.start_date.split("GMT")[0];
  event.end_date = event.end_date.split("GMT")[0];

  if (event.timezone !== undefined && event.timezone.includes("$")) {
    // $ splits time and timezone in the event.timezone field in firebase!
    const tz = tzString.split("$")[0];
    const daylightSavings = tzString.split("$")[1] === "true" ? true : false;
    const offset = getOffset(tz, daylightSavings);

    // First convert the event's time to UTC, assuming the event is in EST time (America/New_York)
    // America/New_York should be changed to the user's time zone who created the event, if they
    // Choose to use their time zone rather than EST.
    const UTCStart = convertDateToUTC(convertTimestampToDate(event.start_date), offset);
    const UTCEnd = convertDateToUTC(convertTimestampToDate(event.end_date), offset);

    // Second, convert those consts above to user's local time
    event.start_date = convertUTCToLocal(UTCStart);
    event.end_date = convertUTCToLocal(UTCEnd);
    // get timezone to display
    event.timeZoneGMT = getTimezoneName(getCurrentLocationForTimeZone(), dst());
  }
  return event;
}

let convertedExampleEvent = convertEventsTime(exampleEvent)

class EventFormDesktop extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      feedbackSubmit: false,
      errStatus: 0,
      activityIndicatory: false,
      imgFileValue: "",
      imgurLink: "",
      sampleEvent: convertedExampleEvent
    };

    this.submitHandler = this.submitHandler.bind(this);
    this.uploadData = this.uploadData.bind(this);
    this.handleImageUpload = this.handleImageUpload.bind(this);
    this.uploadImage = this.uploadImage.bind(this);
    this.updateEvent = this.updateEvent.bind(this);

  }

  getMonthName() {
    var d = new Date();
    var month = new Array();
    month[0] = "January";
    month[1] = "February";
    month[2] = "March";
    month[3] = "April";
    month[4] = "May";
    month[5] = "June";
    month[6] = "July";
    month[7] = "August";
    month[8] = "September";
    month[9] = "October";
    month[10] = "November";
    month[11] = "December";
    return month[d.getMonth()];
  }

  submitHandler(values) {
    if (this.state.imgurLink !== "") {
      values['image_link'] = this.state.imgurLink
    }
    console.log(values)
    this.setState({ activityIndicatory: true });
    const b = this.uploadData(values);
  }

  // upload to firebase here
  uploadData(data) {
    data["approved"] = false;
    data["start_date"] = data["start_date"].toString();
    data["end_date"] = data["end_date"].toString();
    const from = data["email"];
    const subject = "NEW EVENT: " + data["title"];
    const clientSubject = "Your CVC Event Details: " + data["title"];
    data = processTags(data);
    const text = formatEmailText(data);
    if (data['title'] !== undefined)
      data['event'] = data['title']
    const approvalUrl = "https://us-central1-columbia-virtual-campus.cloudfunctions.net/approveEvent?eventId=";
    const zoomUrl = "https://zoom.us/oauth/authorize?response_type=code&client_id=OApwkWCTsaV3C4afMpHhQ&redirect_uri=https%3A%2F%2Fcolumbiavirtualcampus.com%2Fevents%2Fhandle-approve&state="
    const clientEmailData = {
      to: from,
      from: "columbiavirtualcampus@gmail.com",
      subject: clientSubject,
      text: text
    };

    const emailData = {
      from: from,
      subject: subject,
      text: text
    };


    const db = firebase.firestore();
    const newEventRef = db.collection("events").doc();
    clientEmailData["text"] = "Your New Event Request!\n<br>Here's what we are currently processing:\n <br>" +
        emailData["text"] + "\n<br>NOTE: The correct timezone is in the \'timezone\': field!\n<br><br>"
        + "Please contact us if any of the above needs corrected or if you have any questions!"
        + "\n<br>\n<br>Best,\n<br>The CVC Team";
    emailData["text"] = "New Event Request!\n <br>" +
        emailData["text"].concat("\n<br> NOTE: The correct timezone is in the 'timezone': field!"
            + "<br><br>Click here to approve this event: ",
            approvalUrl.concat(newEventRef.id));
    if (data["zoomLink"]) {
      console.log("Zoom link: " + data["zoomLink"])
      emailData["text"] += "\n<br> USER REQUESTED ZOOM LINK, click here to create zoom meeting: " +
          zoomUrl.concat(newEventRef.id);
    }
    emailData["subject"] += ". ID: " + newEventRef.id;
    newEventRef.set(data)
        .then(ref => {

          Axios.post("https://us-central1-columbia-virtual-campus.cloudfunctions.net/sendEmail", emailData)
              .then(res => {
                console.log("Success 1");
                Axios.post("https://us-central1-columbia-virtual-campus.cloudfunctions.net/sendEmail", clientEmailData)
                    .then(res => {
                      console.log("Success 2");
                      this.setState({ feedbackSubmit: true, activityIndicatory: false });
                    })
                    .catch(error => {
                      this.setState({ errStatus: 3 });
                      console.log("Updated error");
                    });
              })
              .catch(error => {
                this.setState({ errStatus: 1 });
                console.log("Updated error");
              });
        })
        .catch(function (error) {
          console.error("Error adding document: ", error);
          alert("Failed to properly request your event. Please try adding the event again. If the problem persists please contact us!");
        });

    if (data["zoomLink"]) {
      //sendZoomEmail(newEventRef.id, data["event"], from);
    }

    return emailData["text"];
  }

  imgFileUploadHandler = (fileList) => {
    // console.log("congrats, you clicked me.")
    const fileName = fileList[0].name
    const file = fileList[0]

    this.uploadImage(file)
    this.setState({
      imgFileValue: fileName
    })
  }

  uploadImage = (file) => {
    let imgur = ""
    const r = new XMLHttpRequest();
    const d = new FormData();
    const clientID = "df36f9db0218771";

    d.append("image", file);

    // Boilerplate for POST request to Imgur
    r.open("POST", "https://api.imgur.com/3/image/");
    r.setRequestHeader("Authorization", `Client-ID ${clientID}`);
    r.onreadystatechange = () => {
      if (r.status === 200 && r.readyState === 4) {
        let res = JSON.parse(r.responseText);
        // this is the link to the uploaded image
        imgur = `https://i.imgur.com/${res.data.id}.png`;

        this.setState({ imgurLink: imgur })

        this.updateEvent(undefined)
      }
    };
    // send POST request to Imgur API
    r.send(d);
  }

  getHeadMessage() {

    if (this.state.errStatus === 4) {
      return "Oops... Sorry! There was an error handling your request.";
    } else if (this.state.errStatus === 3 || this.state.errStatus === 1) {
      return "Thank You! Further Action Required!";
    } else if (this.state.errStatus === 2) {
      return "Oops... Sorry! There was an error handling your request.";
    } else {
      return "Thank You!";
    }
  }

  getBodyMessage() {

    if (this.state.errStatus === 4) {
      return "We were unable to process your request due to an unexpected error. " +
          "Please try again. If the problem persists please reach out to us:";
    } else if (this.state.errStatus === 3 || this.state.errStatus === 1) {
      return "Please contact us about approving your event! We were unable to automatically email our team."
          + " Please reach out to us at:";
    } else if (this.state.errStatus === 2) {
      return "We were unable to process your request. Please try again. " +
          "If the problem persists please reach out to us:";
    } else {
      return "We look forward to hosting your event on CVC! " +
          "If there is anything that needs to be updated, please reach out to us.";
    }
  }

  getFileName() {
    if (this.state.imgFileValue !== "") {
      return this.state.imgFileValue;
    }
    return ""
  }

  handleImageUpload() {
    console.log(this.inputElement);
    this.inputElement.props.label = "Image Uploaded";
    this.inputElement.touch = true;
  }

  updateEvent(data) {

    console.log("Sensed update")

    // First, update image
    if (this.state.imgurLink !== "")
      convertedExampleEvent['image_link'] = this.state.imgurLink === "" ? default_img : this.state.imgurLink

    // Data will be undefined if the user pastes an url for the image.
    // We still want to update the state so it will render image


    if (data !== undefined) {
      const name = data.target.name
      const value = data.target.value
      if (name === "image_link") {
        if (value === "") {
          this.setState({ imgurLink: default_img, imgFileValue: "" })
          convertedExampleEvent['image_link'] = default_img
        } else {
          this.setState({ imgurLink: value, imgFileValue: "" })
          convertedExampleEvent['image_link'] = value
        }
      }
      if (name.substr(-3) === "tag") {
        // Process button tags
        this.pushToTags(convertedExampleEvent, value, true);

      } else if (name.substr(-10) === "other_tags") {
        // Process typed tags
        convertedExampleEvent[name] = value
        const prev_tags = convertedExampleEvent['tags']
        convertedExampleEvent = processTags(convertedExampleEvent)
        prev_tags.map((object, i) => {
          if (object.substr(-4) === "_tag")
            this.pushToTags(convertedExampleEvent, object);
        })

      } else {
        // Just simply update the dictionary if other values
        convertedExampleEvent[name] = value
      }

      // Just to make sure we have an event and title, they are equivalent
      convertedExampleEvent['event'] = convertedExampleEvent['title']
    }

    this.setState({ sampleEvent: convertedExampleEvent })
  }

  pushToTags(event, tag, remove = false) {
    if (event['tags'].includes(tag) === false) {
      event['tags'].push(tag)
    } else if (remove) {
      // Remove if toggle button turned off
      event['tags'] = event['tags'].filter(x => x !== tag)
    }
  }

  getSampleEvent() {
    return this.state.sampleEvent
  }


  render() {
    const date = new Date();
    if (this.state.activityIndicatory) {
      return (
          <div style={{ backgroundColor: "white" }}>
            <div style={{ backgroundColor: "white" }}>
              <CustomHeader active={"schedule"} brand={"VIRTUAL CAMPUS"} />
              <div style={{ marginTop: '25%', marginLeft: '50%' }}>
                <CircularProgress />
              </div>
            </div>
          </div>
      )
    }
    else if (this.state.feedbackSubmit) {
      return (
          <div style={{background: "white"}}>
            <Template title={'Add New Event'} active={"schedule"}>
              <div style={{
                fontFamily: "Poppins",
                fontStyle: "normal",
                fontWeight: "normal",
                fontSize: "1.5rem",
                lineHeight: "30px",
                color: "#0072CE",
                margin: "10px",
                textAlign: "center",
                paddingTop: "16%"
              }}>
                <div style={{ fontSize: "2.5rem" }}> {this.getHeadMessage()} </div>
                <br />
                <br />
                <div style={{
                  color: "black",
                  paddingLeft: "20%", paddingRight: "20%"
                }}> {this.getBodyMessage()}</div>
                <br />
                <br />
                <div style={{ color: "black", fontSize: "1rem" }}>
                  Questions? Contact us at
                  <a style={{ color: "#0072CE", display: "inline-block", paddingLeft: "0.3%" }}
                     href={"mailto:columbiavirtualcampus@gmail.com"}> columbiavirtualcampus@gmail.com.</a>
                </div>
                <br />
                <br />
                <Button
                    style={{
                      background: "white",
                      border: "1px solid #FB750D",
                      borderRadius: "10px",
                      boxSizing: "border-box",
                      color: "#FB750D",
                      boxShadow: "none",
                      paddingLeft: "10px",
                      paddingRight: "10px"
                    }}
                    href={"/events/add-new-event"}>
                  Add Another Event
                </Button>
              </div>
            </Template>
            <CustomFooter />
          </div>);

    } else {
      return (
          <div style={{background: "white"}}>
          <Template title={'Add New Event'} active={"schedule"}>
            <MuiPickersUtilsProvider utils={DateFnsUtils}>
              {/* <Template active={'schedule'}> */}
              <div style={{ backgroundColor: "white" }}>
                <Container>
                  {/* <div className={classes.container} style={{ paddingTop: '85px' }}> */}
                  <Grid container spacing={10}>
                    <FormTitle
                        desktop
                        title="Add a New Event"
                        desc="Thank you for your interest in creating a virtual event or activity through CVC.
                     Please fill out the following form so we can provide you with the necessary resources and
                     appropriate platform on our website!"
                    />
                    <Grid item xs={8}>
                      <Formik
                          initialValues={initVal}
                          onSubmit={this.submitHandler}
                          onChange={this.updateEvent}
                          validationSchema={validationSchema}
                      >
                        {({ dirty, isValid, errors, touched }) => {
                          return (
                              <Form onChange={this.updateEvent}>
                                <RequiredFields
                                    title="Event"
                                    entryTitle="Event Name"
                                    errors={errors}
                                    touched={touched}
                                    timezones={optionsTZ}
                                />
                                {/* <div style={{ height: "30px" }} /> */}
                                <ExpansionPanel>
                                  <ExpansionPanelSummary>
                                    <div>Advanced Options</div>
                                  </ExpansionPanelSummary>
                                  <ExpansionPanelDetails>
                                    <AdvancedFields
                                        errors={errors}
                                        touched={touched}
                                        fileName={this.getFileName()}
                                        imgUpload={this.imgFileUploadHandler}
                                        onChange={this.updateEvent}
                                    />
                                  </ExpansionPanelDetails>
                                </ExpansionPanel>

                                <div style={{ margin: '15px 0 0 0' }}>
                                  By hosting an event you agree to the <a
                                    href="https://bit.ly/events-policy-docs"
                                    target="_blank">Columbia Events Policy</a>.
                                </div>
                                <Field
                                    component={CheckboxWithLabel}
                                    name="agree"
                                    Label={{ label: "I agree to the Columbia Events Policy." }}
                                    type="checkbox"
                                    indeterminate={false}
                                    color="default"
                                />
                                <SubmitButton />

                              </Form>
                          )
                        }}
                      </Formik>
                    </Grid>
                  </Grid >
                  <div style={{ marginBottom: "50px" }} />
                  {/* </div> */}
                </Container>
              </div>
              {/* </Template > */}
            </MuiPickersUtilsProvider>
            <Container>
              <h3 style={{ color: "#0072CE", display: "inline" }}>
                <span style={{ display: "block" }}>Preview of Your Event</span>
                <div style={{ color: "#0072CE", display: "inline", fontSize: "12px" }}>
                  Date/Time is not updated in previews:
                </div>
              </h3>
              <br />
              <Grid >
                <div style={{ marginBottom: "5%" }}>
                  <h3 style={{ textAlign: "left", color: "#F1945B", fontSize: "20px", fontWeight: 100 }}> {this.getMonthName()} {date.getFullYear()}</h3>
                  <div style={{ color: "#F1945B", backgroundColor: "#F1945B", height: 3 }} />
                  <EventCardDesktop ele={this.getSampleEvent()} key={0} />
                </div>
              </Grid>
            </Container>
          </Template>
          <CustomFooter />
          </div>

      );
    }
  }


}

export default EventFormDesktop;

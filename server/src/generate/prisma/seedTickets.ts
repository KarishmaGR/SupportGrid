import "dotenv/config";
import { prisma } from "../../db.ts";

// Realistic student support tickets across General, Technical, and Refund categories.
// Spread across the past 6 months with varied statuses so sorting and filtering are useful.

const senders = [
  { name: "Emma Johnson",      email: "emma.johnson@university.edu" },
  { name: "Liam Smith",        email: "liam.smith@university.edu" },
  { name: "Olivia Williams",   email: "olivia.w@university.edu" },
  { name: "Noah Brown",        email: "noah.brown@university.edu" },
  { name: "Ava Jones",         email: "ava.jones@university.edu" },
  { name: "Ethan Garcia",      email: "ethan.garcia@university.edu" },
  { name: "Sophia Martinez",   email: "sophia.m@university.edu" },
  { name: "Mason Davis",       email: "mason.davis@university.edu" },
  { name: "Isabella Wilson",   email: "isabella.w@university.edu" },
  { name: "James Anderson",    email: "james.a@university.edu" },
  { name: "Charlotte Thomas",  email: "charlotte.t@university.edu" },
  { name: "Benjamin Taylor",   email: "ben.taylor@university.edu" },
  { name: "Amelia Moore",      email: "amelia.moore@university.edu" },
  { name: "Lucas Jackson",     email: "lucas.j@university.edu" },
  { name: "Mia Harris",        email: "mia.harris@university.edu" },
  { name: "Henry White",       email: "henry.white@university.edu" },
  { name: "Evelyn Martin",     email: "evelyn.m@university.edu" },
  { name: "Alexander Lee",     email: "alex.lee@university.edu" },
  { name: "Harper Thompson",   email: "harper.t@university.edu" },
  { name: "Sebastian Clark",   email: "seb.clark@university.edu" },
];

type Category = "General" | "Technical" | "Refund";
type Status   = "Open" | "Resolved" | "Closed";

interface TicketTemplate {
  subject: string;
  body: string;
  category: Category;
}

const tickets: TicketTemplate[] = [
  // ── General ──────────────────────────────────────────────────────────────
  {
    subject: "Question about course registration deadline",
    body: "Hi, I wanted to check if the course registration deadline for the spring semester has been extended. I was unable to register on time due to a family emergency. Could you please advise on the process to register late?",
    category: "General",
  },
  {
    subject: "Missing lecture notes from Week 3",
    body: "Hello, the lecture notes for Week 3 of CS101 do not appear on the portal. I have checked multiple times over the past two days. Could someone please upload them or send them to me directly?",
    category: "General",
  },
  {
    subject: "Inquiry about scholarship application process",
    body: "I would like to know more about the merit-based scholarship available for second-year students. What documents are required and what is the application deadline? Any guidance would be appreciated.",
    category: "General",
  },
  {
    subject: "Request for academic transcript",
    body: "I need an official academic transcript sent to a graduate school I am applying to. Please let me know the steps to request one and the expected turnaround time.",
    category: "General",
  },
  {
    subject: "Campus library access hours during exam period",
    body: "Could you confirm the library opening hours during the upcoming exam period? I have heard they may be extended but I cannot find this information on the website.",
    category: "General",
  },
  {
    subject: "How do I change my major?",
    body: "I have decided to switch from Business Administration to Computer Science. What is the formal process for changing my declared major? Are there any prerequisites or advisor meetings required?",
    category: "General",
  },
  {
    subject: "Parking permit for semester",
    body: "I am a commuter student and need to apply for a parking permit for this semester. The online portal shows the option as greyed out. How should I proceed?",
    category: "General",
  },
  {
    subject: "Graduation ceremony ticket request",
    body: "I would like to request additional graduation ceremony tickets for my family. The standard allocation is two but I have four family members attending. Is it possible to get extra tickets?",
    category: "General",
  },
  {
    subject: "Off-campus housing recommendation",
    body: "As an international student moving to the area, I am looking for safe and affordable off-campus housing options. Does the university provide any housing listings or partnerships with local landlords?",
    category: "General",
  },
  {
    subject: "Study abroad program inquiry",
    body: "I am interested in the semester exchange program with partner universities in Europe. Could you share the list of available partner institutions, the application timeline, and any GPA requirements?",
    category: "General",
  },
  {
    subject: "Student ID card replacement",
    body: "I lost my student ID card yesterday on campus. How do I get a replacement? Is there a fee involved and how long will it take?",
    category: "General",
  },
  {
    subject: "Question about add/drop period",
    body: "I signed up for a course that conflicts with my work schedule and I would like to drop it. Has the add/drop period ended? If so, what are my options for a late withdrawal?",
    category: "General",
  },
  {
    subject: "Academic advisor appointment request",
    body: "I have been trying to book an appointment with my academic advisor through the portal but all slots appear to be taken for the next three weeks. Is there an alternative way to contact them urgently?",
    category: "General",
  },
  {
    subject: "Club registration for new student organisation",
    body: "A group of us want to start a data science club on campus. What are the steps to officially register a new student organisation? Do we need a faculty advisor?",
    category: "General",
  },
  {
    subject: "Request for letter of enrollment",
    body: "My bank is asking for an official letter of enrollment to process my student account upgrade. Could you please issue one confirming that I am currently enrolled as a full-time student?",
    category: "General",
  },
  {
    subject: "Gym access for online students",
    body: "I am enrolled as an online student but I live near campus. Am I eligible to use the campus gym facilities? If so, what do I need to show at the front desk?",
    category: "General",
  },
  {
    subject: "Feedback on the new student portal design",
    body: "I wanted to share some feedback on the recently updated student portal. The new layout makes it difficult to find grade submissions. The old design was more intuitive. Is there a way to submit formal feedback?",
    category: "General",
  },
  {
    subject: "Mental health resources for students",
    body: "I have been feeling overwhelmed this semester and would like to know what mental health support is available on campus. Are there counselling sessions available and how do I book one?",
    category: "General",
  },
  {
    subject: "Internship credit hours eligibility",
    body: "I have secured a summer internship at a tech company. Can I earn academic credit for this experience? What forms do I need to complete and is there a supervisor evaluation involved?",
    category: "General",
  },
  {
    subject: "Notification about grade appeal process",
    body: "I received a grade I believe is incorrect in my final exam for MATH202. I spoke with the professor but could not reach an agreement. What is the formal grade appeal process and what is the deadline?",
    category: "General",
  },

  // ── Technical ─────────────────────────────────────────────────────────────
  {
    subject: "Cannot log in to student portal",
    body: "I have been trying to log in to the student portal since this morning but keep getting an 'Invalid credentials' error. I have reset my password twice and the issue persists. Please help.",
    category: "Technical",
  },
  {
    subject: "Video lectures not loading in Chrome",
    body: "The lecture videos for PHYS101 are not loading in Google Chrome. They spin indefinitely and never play. I have tried clearing my cache and disabling extensions. The issue does not occur in Safari.",
    category: "Technical",
  },
  {
    subject: "Assignment submission portal showing error 500",
    body: "Every time I attempt to submit my ENGL210 essay through the portal I receive a 500 Internal Server Error. The deadline is tomorrow morning and I am unable to submit. This is urgent.",
    category: "Technical",
  },
  {
    subject: "Two-factor authentication code not arriving",
    body: "I enabled two-factor authentication last week. Since then I have not been receiving the SMS verification codes. I have confirmed my phone number is correct. I cannot access my account.",
    category: "Technical",
  },
  {
    subject: "Zoom integration broken in learning management system",
    body: "The Zoom links embedded in the LMS are not launching the meeting correctly. Clicking the link redirects me to the LMS homepage instead of opening Zoom. This is affecting all my online classes.",
    category: "Technical",
  },
  {
    subject: "Gradebook not showing updated marks",
    body: "My professor mentioned she uploaded grades for our midterm three days ago but the gradebook still shows 'Pending'. Other students say they can see their grades. Could you investigate?",
    category: "Technical",
  },
  {
    subject: "Email account storage quota exceeded",
    body: "I have received a warning that my university email storage is at 100% capacity and I can no longer send or receive emails. I have deleted many old messages but the quota has not updated.",
    category: "Technical",
  },
  {
    subject: "Campus Wi-Fi disconnects every few minutes",
    body: "The eduroam Wi-Fi network in the engineering building keeps disconnecting every 5–10 minutes. I have re-entered my credentials and tried reconnecting but the issue is consistent across multiple devices.",
    category: "Technical",
  },
  {
    subject: "VPN access not working off campus",
    body: "I am trying to access research databases from home using the university VPN client but it fails to connect. I receive a 'Network timeout' error. My internet connection is fine.",
    category: "Technical",
  },
  {
    subject: "Print quota not resetting after payment",
    body: "I topped up my print quota online three days ago. The payment went through but my account still shows zero credits. I have a 30-page assignment to print before class tomorrow.",
    category: "Technical",
  },
  {
    subject: "Mobile app crashing on Android",
    body: "The university mobile app crashes immediately after the splash screen on my Android 13 device. I have uninstalled and reinstalled it twice. The issue started after the latest app update.",
    category: "Technical",
  },
  {
    subject: "Cannot access e-library from off campus",
    body: "I am unable to access JSTOR and the other e-library resources from home. I authenticate via the university login but then receive an 'Access Denied' message. On campus it works fine.",
    category: "Technical",
  },
  {
    subject: "Quiz timer not pausing during network drop",
    body: "During an online quiz in the LMS, my internet dropped for about 2 minutes. When it reconnected the timer had continued running and I lost time. Can the quiz be reset or extended?",
    category: "Technical",
  },
  {
    subject: "Lecture recording missing audio",
    body: "The lecture recording for Tuesday 18 March in BIO103 has no audio. The video plays but it is completely silent. This is the only recording I have of that class as I was ill that day.",
    category: "Technical",
  },
  {
    subject: "Cannot upload PDF to assignment portal",
    body: "I keep getting 'Invalid file format' when uploading my PDF assignment. I have confirmed it is a standard PDF and the size is under 10MB. Other students seem to be able to upload fine.",
    category: "Technical",
  },
  {
    subject: "Discussion board posts not saving",
    body: "I have written a detailed response on the HIST301 discussion board three times but it disappears when I click Submit. The page refreshes and my post is gone. The deadline is tonight.",
    category: "Technical",
  },
  {
    subject: "Password reset email never arrives",
    body: "I requested a password reset email over an hour ago and it has not arrived. I have checked my spam folder. My account is currently locked and I cannot access any university services.",
    category: "Technical",
  },
  {
    subject: "Student portal showing wrong enrolled courses",
    body: "My student portal is showing courses from last semester as my current enrolment. I was told this was fixed two weeks ago but it is still incorrect. My tutors cannot find me on their rosters.",
    category: "Technical",
  },
  {
    subject: "Calendar sync with Google Calendar broken",
    body: "The iCal feed for my timetable is no longer syncing with Google Calendar. Events from last month are stuck and new classes are not appearing. I rely on this for scheduling work shifts.",
    category: "Technical",
  },
  {
    subject: "Plagiarism checker not processing submission",
    body: "I submitted my thesis draft to Turnitin via the portal 24 hours ago. The status still says 'Processing'. All my classmates received their reports within a few hours. The deadline for revisions is tomorrow.",
    category: "Technical",
  },

  // ── Refund ────────────────────────────────────────────────────────────────
  {
    subject: "Refund request for dropped course",
    body: "I dropped ECON201 within the refund eligibility window (within the first two weeks of semester). I have not yet received the tuition credit. Could you please confirm the refund is being processed and the expected timeline?",
    category: "Refund",
  },
  {
    subject: "Double charge for housing deposit",
    body: "I was charged twice for my housing deposit on 5th February. My bank statement clearly shows two identical transactions of £350 to the university. Please investigate and refund the duplicate charge.",
    category: "Refund",
  },
  {
    subject: "Refund for cancelled field trip",
    body: "The field trip for GEO204 was cancelled by the department due to weather. I paid £80 for the trip. When can I expect a refund and will it be returned to my original payment method?",
    category: "Refund",
  },
  {
    subject: "Health insurance waiver not applied",
    body: "I submitted a health insurance waiver in September as I have private coverage through my parents' plan. The fee of £320 was still charged to my student account. Please remove this charge.",
    category: "Refund",
  },
  {
    subject: "Overpayment on tuition fees",
    body: "I accidentally paid my tuition fees twice — once by bank transfer and once by card. The total overpayment is £1,200. Could you process a refund for the duplicate payment to my bank account?",
    category: "Refund",
  },
  {
    subject: "Parking permit refund after vehicle sold",
    body: "I purchased a semester parking permit in September but sold my car in October. I would like to request a partial refund for the remaining months. Is this possible and what documentation do you need?",
    category: "Refund",
  },
  {
    subject: "Withdrawal refund status inquiry",
    body: "I formally withdrew from the university on 10th January. I was told I would receive a 50% tuition refund within 30 business days. It has now been 45 days and nothing has been credited. Please update me on the status.",
    category: "Refund",
  },
  {
    subject: "Lab fee charged for online course",
    body: "I am enrolled in CHEM101 as a fully online section but was still charged a £150 lab fee. Online students are not required to attend labs. Please remove this charge from my account.",
    category: "Refund",
  },
  {
    subject: "Textbook deposit refund",
    body: "I returned the borrowed textbook for PSY101 to the library on 12th March and received a receipt. However the £45 deposit has not been refunded to my student account. Could you look into this?",
    category: "Refund",
  },
  {
    subject: "Refund for sports membership — medical withdrawal",
    body: "I purchased a full-year sports centre membership but have been advised by my doctor not to exercise due to a knee injury. I have a medical certificate. Am I eligible for a pro-rata refund?",
    category: "Refund",
  },
  {
    subject: "Conference registration fee refund",
    body: "I registered for the student research conference in April and paid the £25 registration fee. The conference was subsequently moved online and I was told in-person registrants would receive a refund. I have not received mine.",
    category: "Refund",
  },
  {
    subject: "Incorrect module fee billed",
    body: "I am registered for a 15-credit module but have been billed for a 30-credit module. The difference is £600. Please correct this error and refund the overpayment.",
    category: "Refund",
  },
  {
    subject: "Accommodation refund — early departure",
    body: "Due to a family bereavement I had to leave student accommodation two months early. My accommodation contract allows early departure with four weeks' notice, which I gave. When will the remaining rent be refunded?",
    category: "Refund",
  },
  {
    subject: "Print credit refund at end of year",
    body: "I am graduating this semester and have £18.50 remaining in my print credit account. I understand graduating students can request a refund of any remaining balance. How do I do this?",
    category: "Refund",
  },
  {
    subject: "Refund for duplicate exam entry fee",
    body: "I was charged twice for the resit exam registration fee (£45 × 2). I only registered once and have the confirmation email showing a single registration. Please refund the duplicate charge.",
    category: "Refund",
  },
  {
    subject: "Society membership fee refund",
    body: "I joined the Photography Society in September but the society became inactive in November with no events or communication. I would like a refund of my £20 membership fee as I received no benefit.",
    category: "Refund",
  },
  {
    subject: "Tuition fee refund for international student visa refusal",
    body: "Unfortunately my student visa was refused after I had paid tuition fees for the upcoming academic year. I understand the university has a visa refusal refund policy. Could you guide me through the process?",
    category: "Refund",
  },
  {
    subject: "Incorrect late payment penalty applied",
    body: "I was charged a £75 late payment penalty on my tuition account. However I have evidence that my payment was submitted before the deadline. Please review and remove the penalty.",
    category: "Refund",
  },
  {
    subject: "Online course cancellation refund",
    body: "I enrolled in an optional online certification course run by the university. The course was cancelled by the provider after two weeks. I paid £195 upfront. When will I be refunded?",
    category: "Refund",
  },
  {
    subject: "Gym membership refund — facility closure",
    body: "The campus gym was closed for six weeks due to renovation work. I paid for a full semester membership. Am I entitled to a partial refund or credit for the weeks the facility was unavailable?",
    category: "Refund",
  },

  // ── Extra mix to reach 100 ────────────────────────────────────────────────
  {
    subject: "Cannot find timetable for new semester",
    body: "The timetable for the upcoming semester is not showing in my portal. My classmates all have access to theirs. I have tried logging out and back in but it has not helped.",
    category: "Technical",
  },
  {
    subject: "Request for disability support services",
    body: "I have been recently diagnosed with dyslexia and I would like to register for disability support services. Could you let me know what documentation is required and what accommodations are available?",
    category: "General",
  },
  {
    subject: "Refund for unused meal plan",
    body: "I switched to off-campus housing halfway through the semester and no longer need the meal plan I purchased. I have used approximately 40% of it. Can I get a partial refund for the unused portion?",
    category: "Refund",
  },
  {
    subject: "Portal shows incorrect GPA calculation",
    body: "My student portal is displaying a GPA of 2.8 but when I manually calculate based on my grades it should be 3.4. I believe one module grade has not been correctly entered. Please investigate.",
    category: "Technical",
  },
  {
    subject: "Question about deferring an exam",
    body: "I am due to sit my final exams next month but I have been dealing with a medical issue. What is the process for requesting a deferred exam and what evidence will I need to provide?",
    category: "General",
  },
  {
    subject: "Notification preferences not saving",
    body: "Every time I update my email notification preferences in the portal they reset to default the next day. I want to disable weekly digest emails but the setting never sticks.",
    category: "Technical",
  },
  {
    subject: "Refund for unused printing credits",
    body: "I am taking a leave of absence next semester and will not be on campus. I have £32 in printing credits remaining. Can these be refunded or will they be held until I return?",
    category: "Refund",
  },
  {
    subject: "Query about English language support classes",
    body: "As an international student I would like to improve my academic writing. Are there any free English language support classes or workshops available and how do I enrol?",
    category: "General",
  },
  {
    subject: "Lecture slides not accessible for screen reader",
    body: "The PDF lecture slides for PSYCH205 are image-based and cannot be read by my screen reader. Could the lecturer be asked to provide accessible versions or I be given alternative materials?",
    category: "Technical",
  },
  {
    subject: "Incorrect charge for international student fee",
    body: "My student account has been charged at the international fee rate, but I am a home student. I have lived in the UK for my entire life. This amounts to an overcharge of approximately £8,000. Please rectify urgently.",
    category: "Refund",
  },
  {
    subject: "Request for extension on assignment",
    body: "I have been unwell with flu this week and was unable to complete my MKTG301 assignment due today. I have a doctor's note. Could I please be granted a 5-day extension?",
    category: "General",
  },
  {
    subject: "SSO login failing for Microsoft 365",
    body: "The single sign-on for Microsoft 365 is not working. When I click 'Sign in with university account' I am redirected to an error page saying 'SAML authentication failed'.",
    category: "Technical",
  },
  {
    subject: "Refund for voluntary withdrawal from accommodation",
    body: "I have decided to move back home for personal reasons and will be vacating my university accommodation at the end of this month. I have paid rent through to June. Please advise on the refund process.",
    category: "Refund",
  },
  {
    subject: "Peer tutoring programme information",
    body: "I am struggling with calculus and heard the university runs a peer tutoring programme. How do I sign up and is there a cost involved? What subjects are available?",
    category: "General",
  },
  {
    subject: "File size limit too restrictive for video submission",
    body: "My MEDIA401 assignment requires uploading an edited video. The portal has a 100MB file limit but my exported video is 340MB, even after compressing. Can the limit be raised for this course?",
    category: "Technical",
  },
  {
    subject: "Refund for overpaid accommodation deposit",
    body: "When I applied for accommodation I accidentally transferred £1,000 instead of the required £500 deposit. The extra £500 was not credited to my rent account. Please refund the overpayment.",
    category: "Refund",
  },
  {
    subject: "How to request a leave of absence",
    body: "Due to a family health situation I need to take a temporary leave of absence for one semester. What is the process, will my place be held, and will I be charged fees during the leave period?",
    category: "General",
  },
  {
    subject: "Online exam showing wrong time zone",
    body: "My online exam is scheduled for 14:00 but the LMS is displaying the time in UTC rather than my local time zone. I am based in India. Could you confirm what local time the exam actually begins?",
    category: "Technical",
  },

  // ── Final 22 to reach 100 ─────────────────────────────────────────────────
  {
    subject: "Lecture hall room change not reflected in timetable",
    body: "I received an email saying my Monday lecture for LAW201 has moved to Room B14 but my timetable still shows Room A02. Could you update the system so students are directed to the correct room?",
    category: "General",
  },
  {
    subject: "Cannot download software licence from IT portal",
    body: "I am trying to download the student MATLAB licence from the IT portal. The download button returns a 404 error. I need it urgently for a coursework submission due on Friday.",
    category: "Technical",
  },
  {
    subject: "Refund for exam resit fee — passed on first attempt",
    body: "I paid the £45 resit registration fee in advance as I was unsure if I would pass. I passed on the first attempt so the resit is unnecessary. Please refund the fee.",
    category: "Refund",
  },
  {
    subject: "Information about part-time study option",
    body: "I am currently a full-time student but due to financial pressures I am considering switching to part-time. How would this affect my fees, financial aid, and expected graduation date?",
    category: "General",
  },
  {
    subject: "Assignment feedback not visible in portal",
    body: "My BIOL302 essay was marked two weeks ago according to my professor. The grade appears in the gradebook but the written feedback is not visible. I need the feedback to prepare for the final exam.",
    category: "Technical",
  },
  {
    subject: "Refund for withdrawn module — medical grounds",
    body: "I was hospitalised in week four and had to withdraw from STAT201. I have supporting medical documentation. Am I entitled to a refund of the module fee and will it affect my financial aid?",
    category: "Refund",
  },
  {
    subject: "How to apply for financial hardship fund",
    body: "I am experiencing financial difficulties this semester following unexpected family circumstances. I understand there is a hardship fund available to students. How do I apply and what is the maximum award?",
    category: "General",
  },
  {
    subject: "Plagiarism report flagging my own prior work",
    body: "My Turnitin report is showing a 35% similarity match against my own work from a previous semester. I understand self-plagiarism is an issue but I cited the earlier work. How do I dispute this?",
    category: "Technical",
  },
  {
    subject: "Tuition fee instalment plan request",
    body: "I am unable to pay my full tuition fee in a single payment this semester. Does the university offer an instalment plan and if so what are the payment schedule options and any associated fees?",
    category: "General",
  },
  {
    subject: "API key for student developer programme expired",
    body: "The API key issued to me through the student developer programme expired last week. I have tried regenerating it through the developer portal but keep getting an authentication error.",
    category: "Technical",
  },
  {
    subject: "Refund for printing credit top-up error",
    body: "I attempted to add £10 to my printing account but accidentally submitted the form three times. I was charged £30 and only needed £10. Please refund £20 to my original payment method.",
    category: "Refund",
  },
  {
    subject: "Consent form for research participation",
    body: "A professor asked me to participate in a research study. I filled in the consent form online two weeks ago but have not heard back. Is there somewhere I can check the status of my registration?",
    category: "General",
  },
  {
    subject: "Notification emails going to spam",
    body: "All emails from the student portal are landing in my spam folder. I have added the sender to my whitelist but the issue persists. I nearly missed an important exam deadline because of this.",
    category: "Technical",
  },
  {
    subject: "Refund after course section merge",
    body: "My original section of COMM101 was merged with another section without my consent. The new section meets at a time I cannot attend due to work. I wish to withdraw and receive a full refund.",
    category: "Refund",
  },
  {
    subject: "Clarification on plagiarism policy for group work",
    body: "Our group project requires each member to submit individually. I want to confirm whether using identical methodology sections across group members' reports would be flagged as plagiarism.",
    category: "General",
  },
  {
    subject: "Audio recording device permission for lectures",
    body: "Due to a hearing impairment I need to record lectures for personal study. What is the process for obtaining formal permission from the university and do I need individual consent from each lecturer?",
    category: "General",
  },
  {
    subject: "Live chat support tool not loading",
    body: "The live chat support widget on the student portal is not loading. The icon appears but clicking it does nothing. I have tried three different browsers and it does not work in any of them.",
    category: "Technical",
  },
  {
    subject: "Refund for summer school programme cancellation",
    body: "The summer school intensive I enrolled in was cancelled by the university 48 hours before it was due to start. I had already paid in full (£450). When will the refund be processed?",
    category: "Refund",
  },
  {
    subject: "Lost coursework submission confirmation email",
    body: "I submitted my coursework through the portal last Thursday but never received a confirmation email. I have a screenshot of the success message. Can you verify the submission was received?",
    category: "Technical",
  },
  {
    subject: "Information about postgraduate application process",
    body: "I am in my final year and considering applying for a postgraduate programme here. Could you explain the internal progression process, whether a separate application is required, and any deadline dates?",
    category: "General",
  },
  {
    subject: "Refund for IT equipment deposit",
    body: "I borrowed a laptop from the IT loan scheme at the start of the year and returned it at the end of semester. The £100 equipment deposit has not been returned to my student account.",
    category: "Refund",
  },
  {
    subject: "Module reading list books not available in library",
    body: "Three of the five core texts on the ECON301 reading list are not available in the library — not in print and not as e-books. Could additional copies be sourced or digital access arranged before the semester starts?",
    category: "General",
  },
];

const statuses: Status[] = ["Open", "Open", "Open", "Resolved", "Closed"];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function seedTickets() {
  const existing = await prisma.ticket.count();
  if (existing >= 100) {
    console.log(`Tickets already seeded (${existing} found). Skipping.`);
    return;
  }

  const records = tickets.map((t, i) => {
    const sender  = randomItem(senders);
    const status  = randomItem(statuses);
    const created = daysAgo(Math.floor(Math.random() * 180)); // spread over 6 months
    const updated = new Date(created.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);

    return {
      subject:     t.subject,
      body:        t.body,
      senderName:  sender.name,
      senderEmail: sender.email,
      category:    t.category,
      status,
      createdAt:   created,
      updatedAt:   status === "Open" ? created : updated,
      // cycle through senders so tickets aren't all from the same person
      // (override with index-based pick for variety)
      _senderOverride: senders[i % senders.length]!,
    };
  });

  await prisma.$transaction(
    records.map((r) =>
      prisma.ticket.create({
        data: {
          subject:     r.subject,
          body:        r.body,
          senderName:  r._senderOverride.name,
          senderEmail: r._senderOverride.email,
          category:    r.category,
          status:      r.status,
          createdAt:   r.createdAt,
          updatedAt:   r.updatedAt,
        },
      }),
    ),
  );

  console.log(`Seeded ${tickets.length} tickets.`);
}

seedTickets()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

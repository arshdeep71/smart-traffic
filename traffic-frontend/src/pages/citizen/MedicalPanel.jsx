import React, { useState, useEffect, useRef } from 'react';
import { Heart, Search, AlertCircle, X, PhoneCall, ChevronRight, LayoutGrid, Check } from 'lucide-react';

// COMPREHENSIVE EMERGENCY MEDICAL DATABASE
const EMERGENCY_DATABASE = [
  {
    id: 'heart-attack',
    title: 'Heart Attack',
    category: 'CARDIAC',
    severity: 'critical',
    urgency: 'Immediate (Within 5 mins)',
    symptoms: ['Chest pain, tightness or pressure', 'Pain radiating to left arm, neck, or jaw', 'Cold sweating & shortness of breath', 'Extreme anxiety & dizziness'],
    actions: [
      'Call 112/108 immediately and state suspected Heart Attack.',
      'Have the patient sit down comfortably on the floor & remain calm.',
      'Loosen any tight clothing around the neck and chest.',
      'If the patient has prescribed Aspirin or Nitroglycerin and is fully conscious, assist them in taking it.',
      'Monitor breathing and responsiveness continuously.'
    ],
    avoid: [
      'Do not let the patient walk, move around, or exert themselves.',
      'Do not give any food or liquids other than prescribed medications.',
      'Do not leave the patient unattended.'
    ],
    recommendation: '🚑 Urgent Advanced Life Support (ALS) Ambulance required.',
    contact: 'Cardiac Trauma Center (108)',
    warningSigns: 'Crushing pressure, sudden fainting, blue lips or fingernails'
  },
  {
    id: 'cardiac-arrest',
    title: 'Cardiac Arrest',
    category: 'CARDIAC',
    severity: 'critical',
    urgency: 'Immediate (Within 1 min)',
    symptoms: ['Sudden collapse', 'Complete unresponsiveness', 'No pulse detected', 'No breathing or only gasping sounds'],
    actions: [
      'Call 112/108 immediately for a Cardiac emergency.',
      'Start CPR (Cardiopulmonary Resuscitation) immediately.',
      'Push hard & fast in the center of the chest (100-120 compressions per minute).',
      'If an AED (Automated External Defibrillator) is available, turn it on and follow voice prompts.',
      'Continue CPR without stopping until emergency personnel arrive.'
    ],
    avoid: [
      'Do not stop CPR for more than a few seconds under any circumstances.',
      'Do not waste time checking for a pulse repeatedly if patient is unresponsive.'
    ],
    recommendation: '🚑 Critical ALS Ambulance Dispatched Immediately.',
    contact: 'Emergency Responders (112)',
    warningSigns: 'Sudden collapse with lack of normal breathing'
  },
  {
    id: 'chest-pain',
    title: 'Chest Pain',
    category: 'CARDIAC',
    severity: 'high',
    urgency: 'High Urgency (Within 15 mins)',
    symptoms: ['Dull pressure or squeeze in the center of the chest', 'Intermittent chest discomfort', 'Shortness of breath', 'Mild nausea or sweating'],
    actions: [
      'Stop all physical activity immediately and rest.',
      'Sit or lie down in a comfortable position.',
      'If chest discomfort lasts more than 5 minutes, treat it as a potential heart attack and call emergency services.',
      'Keep a record of the start time and patterns of the pain.'
    ],
    avoid: [
      'Do not ignore chest discomfort, even if it seems like indigestion.',
      'Do not drive yourself or let the patient drive themselves to the hospital.'
    ],
    recommendation: '🚑 Medical Evacuation Advised for Evaluation.',
    contact: 'Ambulance Services (108)',
    warningSigns: 'Pain spreading to back, neck, jaw, or stomach'
  },
  {
    id: 'heavy-bleeding',
    title: 'Heavy Bleeding',
    category: 'BLEEDING',
    severity: 'critical',
    urgency: 'Immediate (Within 5 mins)',
    symptoms: ['Continuous spurting or heavy flow of blood', 'Large volume of blood loss', 'Cold, clammy skin', 'Dizziness or feeling faint'],
    actions: [
      'Apply firm, direct pressure on the wound using a clean cloth, sterile gauze, or gloved hand.',
      'Elevate the injured limb above the level of the heart if possible.',
      'Keep pressure applied constantly. Do not lift the cloth to check the wound.',
      'Once bleeding slows, secure the dressing with a tight bandage.',
      'If pressure fails and bleeding is in a limb, apply a tourniquet 2 inches above the wound.'
    ],
    avoid: [
      'Do not remove the first cloth or gauze if it gets soaked; add new layers directly on top.',
      'Do not wash or clean deep, severely bleeding wounds.'
    ],
    recommendation: '🚑 Rapid Hemorrhage Control Ambulance Required.',
    contact: 'Trauma Emergency (108)',
    warningSigns: 'Blood spurting from wound, signs of shock (confusion, extreme paleness)'
  },
  {
    id: 'internal-bleeding',
    title: 'Internal Bleeding',
    category: 'BLEEDING',
    severity: 'critical',
    urgency: 'Immediate (Within 10 mins)',
    symptoms: ['Pain, swelling, or bruising in the abdomen/chest', 'Coughing or vomiting blood', 'Extreme weakness, confusion, or cold sweat', 'Rapid, weak heart rate'],
    actions: [
      'Call emergency 112/108 immediately and state suspected internal trauma.',
      'Keep the patient lying flat, warm, and completely still.',
      'Elevate the legs slightly (about 12 inches) to sustain blood flow to vital organs.',
      'Loosen any tight clothing and monitor their airway closely.'
    ],
    avoid: [
      'Do not give the patient anything to eat or drink.',
      'Do not allow the patient to walk or sit up.'
    ],
    recommendation: '🚑 Urgent Trauma Response Unit required.',
    contact: 'Trauma Helpline (108)',
    warningSigns: 'Vomiting black or bright red blood, rapid heart rate, severe confusion'
  },
  {
    id: 'nose-bleeding',
    title: 'Nose Bleeding',
    category: 'BLEEDING',
    severity: 'low',
    urgency: 'Low Urgency (Self-treatment)',
    symptoms: ['Blood dripping or flowing from one or both nostrils', 'Metallic taste in mouth'],
    actions: [
      'Have the person sit upright and lean their head slightly FORWARD.',
      'Pinch the soft, lower part of the nose below the bone for a solid 10–15 minutes.',
      'Breathe through the mouth and apply a cold compress or ice pack wrapped in a cloth to the bridge of the nose.',
      'Spit out any blood that collects in the throat.'
    ],
    avoid: [
      'Do not tilt the head backward (this causes blood to run down the throat, leading to choking or vomiting).',
      'Do not blow or pick the nose for several hours after bleeding stops.'
    ],
    recommendation: '🚑 Standard ambulance not required unless bleeding persists over 30 minutes.',
    contact: 'Primary Health Center',
    warningSigns: 'Bleeding continues past 30 minutes, difficulty breathing, or severe dizziness'
  },
  {
    id: 'fracture',
    title: 'Fracture',
    category: 'INJURY',
    severity: 'medium',
    urgency: 'Moderate Urgency (Within 1 hour)',
    symptoms: ['Intense pain at injury site', 'Visible deformity or unnatural angle of limb', 'Swelling, bruising, and inability to bear weight', 'A grating sensation or sound during movement'],
    actions: [
      'Keep the injured limb completely still. Immobilize it using splints or rolled-up newspapers.',
      'Apply a cold pack wrapped in a towel to reduce swelling and ease pain.',
      'Elevate the fractured limb gently if doing so does not cause severe pain.',
      'If there is an open wound, cover it with a sterile dressing without touching the protruding bone.'
    ],
    avoid: [
      'Do not attempt to push protruding bones back in or realign the bone.',
      'Do not test the limb by trying to move it or bear weight.'
    ],
    recommendation: '🚑 Orthopedic Stabilizing Ambulance recommended.',
    contact: 'Accident Trauma Care (108)',
    warningSigns: 'Loss of pulse or sensation below the fracture, bone protruding, limb turning blue/cold'
  },
  {
    id: 'head-injury',
    title: 'Head Injury',
    category: 'INJURY',
    severity: 'high',
    urgency: 'High Urgency (Within 20 mins)',
    symptoms: ['Confusion, memory loss, or dizziness', 'Bleeding from head wounds', 'Nausea or vomiting', 'Temporary loss of consciousness'],
    actions: [
      'Keep the patient laying completely still with their head and shoulders slightly elevated.',
      'Apply light pressure to any bleeding scalp wounds with a clean cloth.',
      'If neck/spine injury is also suspected, do NOT move the patient at all.',
      'Monitor their alertness and responsiveness continuously. Check pupillary reaction.'
    ],
    avoid: [
      'Do not wash head wounds that are deep or bleeding heavily.',
      'Do not remove any helmet or embedded objects if spinal injury is suspected.'
    ],
    recommendation: '🚑 Emergency Neurosurgical Unit Advised.',
    contact: 'Trauma & ER Services',
    warningSigns: 'Unequal pupil size, repeated vomiting, slurred speech, clear fluid draining from nose/ears'
  },
  {
    id: 'spine-injury',
    title: 'Spine Injury',
    category: 'INJURY',
    severity: 'critical',
    urgency: 'Immediate (Within 5 mins)',
    symptoms: ['Severe neck or back pain', 'Numbness, tingling, or paralysis in hands/feet', 'Loss of bladder/bowel control', 'Unnatural twisting of back/neck'],
    actions: [
      'Do NOT move the patient unless there is immediate, life-threatening danger (like fire).',
      'Instruct the patient to remain absolutely still. Immobilize the head and neck manually.',
      'Place heavy rolled towels or bags on both sides of the head to prevent twisting.',
      'Keep the airway clear while maintaining spinal alignment.'
    ],
    avoid: [
      'Do not bend, twist, or shake the spine, neck, or head.',
      'Do not allow the patient to sit up, roll over, or walk.'
    ],
    recommendation: '🚑 Spine Board Advanced Trauma Ambulance required.',
    contact: 'Spine Specialist Trauma Unit (108)',
    warningSigns: 'Complete loss of sensation or movement in any extremity, breathing difficulty'
  },
  {
    id: 'sprain',
    title: 'Sprain',
    category: 'INJURY',
    severity: 'low',
    urgency: 'Low Urgency (Self-treatment)',
    symptoms: ['Pain and tenderness around the joint', 'Swelling and bruising', 'Limited ability to move the joint'],
    actions: [
      'Remember R.I.C.E. (Rest, Ice, Compression, Elevation).',
      'Rest the injured joint immediately.',
      'Ice the area using an ice pack wrapped in a cloth for 15-20 minutes at a time.',
      'Compress the joint using an elastic support bandage.',
      'Elevate the joint above the level of the heart to prevent fluid buildup.'
    ],
    avoid: [
      'Do not bear weight or force movement in the sprained joint.',
      'Do not apply direct heat (hot water, heat pads) for the first 48 hours.'
    ],
    recommendation: '🚑 Standard ambulance not required. Walk-in clinic recommended.',
    contact: 'Local Outpatient Clinic',
    warningSigns: 'Complete inability to put weight on the joint, severe bone pain on touch'
  },
  {
    id: 'asthma-attack',
    title: 'Asthma Attack',
    category: 'BREATHING',
    severity: 'high',
    urgency: 'High Urgency (Within 10 mins)',
    symptoms: ['Severe wheezing, gasping, or coughing', 'Extreme shortness of breath', 'Tightness in the chest', 'Difficulty speaking in full sentences'],
    actions: [
      'Help the patient sit comfortably upright. Do not let them lie down.',
      'Locate and assist with their quick-relief inhaler (usually blue, Albuterol).',
      'Administer 4 puffs of the inhaler, one puff at a time. Use a spacer if available.',
      'Keep the patient calm and encourage slow, steady breathing.',
      'If there is no improvement after 5-10 minutes, administer another 4 puffs.'
    ],
    avoid: [
      'Do not allow the patient to lie down flat (makes breathing harder).',
      'Do not crowd around the patient; ensure they have plenty of fresh air.'
    ],
    recommendation: '🚑 Urgent Respiratory Support Unit required.',
    contact: 'Respiratory Emergency Care',
    warningSigns: 'Blue tint to lips/fingernails, extreme difficulty speaking, chest sucking in during breaths'
  },
  {
    id: 'choking',
    title: 'Choking',
    category: 'BREATHING',
    severity: 'critical',
    urgency: 'Immediate (Within 1 min)',
    symptoms: ['Inability to speak, cry, cough, or breathe', 'Universal choking sign (hands to throat)', 'High-pitched squeaking or wheezing noises', 'Bluish skin or lips'],
    actions: [
      'Stand behind the victim and wrap your arms around their waist.',
      'Give up to 5 firm back blows between the shoulder blades with the heel of your hand.',
      'If not cleared, give up to 5 rapid abdominal thrusts (Heimlich Maneuver) pushing inward & upward.',
      'Alternate between 5 back blows and 5 abdominal thrusts.',
      'If the person collapses and becomes unresponsive, start CPR immediately.'
    ],
    avoid: [
      'Do not give the person anything to drink or eat.',
      'Do not perform blind finger sweeps inside the mouth as this can push the object deeper.'
    ],
    recommendation: '🚑 Immediate Critical Airway Responders.',
    contact: 'Airway Emergency Team (112)',
    warningSigns: 'Complete silence, gasping, loss of consciousness, turning purple'
  },
  {
    id: 'breathing-difficulty',
    title: 'Breathing Difficulty',
    category: 'BREATHING',
    severity: 'high',
    urgency: 'High Urgency (Within 10 mins)',
    symptoms: ['Rapid, shallow breaths', 'Gasping for air or hyperventilating', 'Anxiety, sweating, and confusion', 'Flared nostrils during breathing'],
    actions: [
      'Help the patient sit upright in a comfortable, relaxed position.',
      'Loosen any tight clothing around their neck, chest, and waist.',
      'Help the patient use their prescribed oxygen or inhalers if available.',
      'Open windows or doors to ensure maximum ventilation.',
      'Encourage slow, deep breathing to counter hyperventilation.'
    ],
    avoid: [
      'Do not leave the patient alone.',
      'Do not make them perform any physical movements or walk.'
    ],
    recommendation: '🚑 Emergency Respiratory Unit advised.',
    contact: 'Pulmonary Care ER',
    warningSigns: 'Gasping, inability to speak, pale or blue skin, lethargy'
  },
  {
    id: 'fire-burn',
    title: 'Fire Burn',
    category: 'BURNS',
    severity: 'medium',
    urgency: 'Moderate Urgency (Within 30 mins)',
    symptoms: ['Redness, pain, swelling, and blisters', 'Peeling skin', 'Charred, white, or black skin (third-degree)'],
    actions: [
      'Cool the burn immediately under cool, running tap water for 10-20 minutes.',
      'Remove any jewelry or constrictive clothing gently from the burned area before swelling starts.',
      'Cover the burn loosely with a clean, dry, non-stick dressing or sterile plastic wrap.',
      'Elevate the burned limb above the level of the heart to prevent swelling.'
    ],
    avoid: [
      'Do not apply butter, oil, grease, ice, or toothpaste to the burn (this traps heat and causes infection).',
      'Do not pop or break any blisters.'
    ],
    recommendation: '🚑 Burn Care Specialist transport recommended.',
    contact: 'Burn Specialty Ward',
    warningSigns: 'Burns on face, hands, feet, or genitals, or burns covering a large area'
  },
  {
    id: 'chemical-burn',
    title: 'Chemical Burn',
    category: 'BURNS',
    severity: 'high',
    urgency: 'High Urgency (Within 15 mins)',
    symptoms: ['Severe stinging or burning sensation', 'Redness, swelling, or blistering', 'Skin discoloration or tissue destruction', 'Fumes causing eye/throat irritation'],
    actions: [
      'Immediately brush away any dry chemical powder using a cloth, then flush with cool, running water.',
      'Flush the affected skin continuously with cool running water for at least 20 minutes.',
      'Carefully remove contaminated clothing, shoes, and jewelry while flushing.',
      'Cover the burned area loosely with a clean, dry, sterile dressing.'
    ],
    avoid: [
      'Do not attempt to neutralize the chemical with other substances (like vinegar or baking soda).',
      'Do not rub the skin or apply any ointments.'
    ],
    recommendation: '🚑 Hazardous Material Medical Unit required.',
    contact: 'Poison Control Center',
    warningSigns: 'Inhalation of chemical fumes, burn covers a large area, pain worsening'
  },
  {
    id: 'electrical-burn',
    title: 'Electrical Burn',
    category: 'BURNS',
    severity: 'critical',
    urgency: 'Immediate (Within 5 mins)',
    symptoms: ['Entry and exit wounds on skin (often small but deep)', 'Muscle spasms, numbness, or tingling', 'Unresponsiveness or cardiac arrhythmia', 'Cold, clammy skin (shock)'],
    actions: [
      'Ensure the victim is completely disconnected from the power source before touching them.',
      'Turn off the main electrical breaker or power switch.',
      'Once safe, check the patient\'s breathing and pulse. Begin CPR immediately if needed.',
      'Cover the entry and exit burn wounds with clean, dry, sterile dressings.',
      'Keep the patient warm and flat to treat for shock.'
    ],
    avoid: [
      'Do not approach a victim who is still in contact with live electricity.',
      'Do not apply water to the burn wounds.'
    ],
    recommendation: '🚑 Emergency Trauma & Cardiac Ambulance required.',
    contact: 'Power & Emergency Services (108)',
    warningSigns: 'Irregular heartbeat, breathing issues, entry/exit wounds, confusion'
  },
  {
    id: 'seizure',
    title: 'Seizure',
    category: 'NEUROLOGICAL',
    severity: 'medium',
    urgency: 'Moderate Urgency (Within 30 mins)',
    symptoms: ['Sudden uncontrollable shaking or convulsions', 'Stiffening of the body', 'Loss of bladder or bowel control', 'Staring blankly or temporary lack of response'],
    actions: [
      'Protect the patient from injury. Clear nearby sharp, hard, or dangerous objects.',
      'Place something soft (like a folded jacket or pillow) under the patient\'s head.',
      'Loosen any tight clothing around the neck (ties, collars).',
      'Time the seizure. Gently roll them onto their side into the recovery position once shaking stops.'
    ],
    avoid: [
      'Do not hold the person down or try to stop their movements.',
      'Do not put anything inside the person\'s mouth (risk of choking or biting).'
    ],
    recommendation: '🚑 Neurological Response recommended if seizure lasts > 5 mins.',
    contact: 'Neuromedical ER (112)',
    warningSigns: 'Seizure lasts longer than 5 minutes, patient has multiple seizures, or stops breathing'
  },
  {
    id: 'stroke',
    title: 'Stroke',
    category: 'NEUROLOGICAL',
    severity: 'critical',
    urgency: 'Immediate (Within 10 mins)',
    symptoms: ['Sudden weakness or numbness in face, arm, or leg (usually on one side)', 'Sudden difficulty speaking or understanding speech', 'Sudden confusion or loss of balance', 'Severe headache with no known cause'],
    actions: [
      'Remember F.A.S.T. (Face drooping, Arm weakness, Speech difficulty, Time to call).',
      'Check if one side of the face droops when smiling.',
      'Have the patient raise both arms to see if one drifts downward.',
      'Note the exact time symptoms started. This is vital for medical treatments.',
      'Call 112/108 immediately and state suspected Stroke.'
    ],
    avoid: [
      'Do not give the patient Aspirin or any other medicines (could worsen bleeding stroke).',
      'Do not give the patient any food or drink.'
    ],
    recommendation: '🚑 Critical Stroke Unit Response required.',
    contact: 'Neurological Trauma Unit (108)',
    warningSigns: 'FAST signs, sudden vision loss, severe sudden headache'
  },
  {
    id: 'unconsciousness',
    title: 'Unconsciousness',
    category: 'NEUROLOGICAL',
    severity: 'high',
    urgency: 'High Urgency (Within 15 mins)',
    symptoms: ['Inability to respond to voice, shake, or pain stimulation', 'Breathing normally but unable to wake up', 'Limp muscles'],
    actions: [
      'Gently shake the shoulders and shout "Are you okay?" to check responsiveness.',
      'If breathing normally, roll the patient onto their side into the recovery position.',
      'Tilt the head back slightly to keep the airway open.',
      'Loosen any tight clothing and keep them warm.',
      'Monitor breathing continuously while waiting for emergency services.'
    ],
    avoid: [
      'Do not leave the patient unattended.',
      'Do not give any food or liquids. Do not splash water on their face.'
    ],
    recommendation: '🚑 High-Priority Emergency Transport Required.',
    contact: 'Emergency ER Service',
    warningSigns: 'Irregular or absent breathing, blue lips, cold clammy limbs'
  },
  {
    id: 'fever',
    title: 'Fever',
    category: 'GENERAL',
    severity: 'low',
    urgency: 'Low Urgency (Self-treatment)',
    symptoms: ['High body temperature (above 99.5°F / 37.5°C)', 'Chills, shivering, and sweating', 'Headache and muscle aches', 'Lethargy and dehydration'],
    actions: [
      'Keep the patient well-hydrated with water, electrolyte drinks, or clear broths.',
      'Ensure they rest in a cool, well-ventilated room.',
      'Administer over-the-counter fever reducers (like Paracetamol) according to guidelines.',
      'Use a lukewarm wet sponge or washcloth on the forehead or body to cool down gently.'
    ],
    avoid: [
      'Do not use cold water, ice baths, or alcohol rubs (causes shivering and raises core temp).',
      'Do not bundle the patient up in heavy blankets.'
    ],
    recommendation: '🚑 Outpatient clinic or home care. No ambulance needed.',
    contact: 'Family Physician / local clinic',
    warningSigns: 'Temperature above 103°F (39.4°C), stiff neck, confusion, or difficulty waking up'
  },
  {
    id: 'food-poisoning',
    title: 'Food Poisoning',
    category: 'GENERAL',
    severity: 'low',
    urgency: 'Low Urgency (Self-care)',
    symptoms: ['Nausea and vomiting', 'Watery or bloody diarrhea', 'Abdominal pain and cramps', 'Mild fever and weakness'],
    actions: [
      'Drink plenty of fluids (ORS, coconut water, diluted sports drinks) in small, frequent sips.',
      'Allow the stomach to settle by avoiding solid foods for a few hours.',
      'Gradually introduce bland, easy-to-digest foods (rice, bananas, toast, applesauce).',
      'Get plenty of bed rest.'
    ],
    avoid: [
      'Do not take anti-diarrhea medications without a doctor\'s prescription.',
      'Do not consume dairy, alcohol, caffeine, or fatty/spicy foods.'
    ],
    recommendation: '🚑 Self-care or outpatient consultation. No ambulance required.',
    contact: 'General Practitioner Clinic',
    warningSigns: 'Severe dehydration (no urination), high fever, blood in vomit or stool, vomiting lasting >24 hours'
  },
  {
    id: 'allergic-reaction',
    title: 'Allergic Reaction',
    category: 'GENERAL',
    severity: 'high',
    urgency: 'High Urgency (Within 10 mins)',
    symptoms: ['Hives, itching, or red skin rashes', 'Swelling of the face, lips, tongue, or throat', 'Wheezing or difficulty breathing', 'Dizziness, weak pulse, or confusion'],
    actions: [
      'Identify and immediately remove the source of the allergen (food, sting, etc.).',
      'If the patient has a severe reaction (Anaphylaxis) and carries an epinephrine auto-injector (EpiPen), administer it immediately into the outer thigh.',
      'Have the patient sit upright and keep their airway clear.',
      'Loosen tight clothing and keep them warm and calm.'
    ],
    avoid: [
      'Do not ignore early signs of swelling around the mouth or throat.',
      'Do not give oral antihistamines if the patient has difficulty swallowing.'
    ],
    recommendation: '🚑 Anaphylaxis Shock Responders Ambulance Required.',
    contact: 'Allergy Emergency Care',
    warningSigns: 'Swelling of the tongue/throat, difficulty breathing, throat tightness, weak pulse, dizziness'
  },
  {
    id: 'heat-stroke',
    title: 'Heat Stroke',
    category: 'GENERAL',
    severity: 'high',
    urgency: 'High Urgency (Within 15 mins)',
    symptoms: ['High body temperature (above 104°F / 40°C)', 'Hot, red, dry, or damp skin', 'Confusion, slurred speech, or hallucinations', 'Rapid, strong pulse and fainting'],
    actions: [
      'Move the patient to a cool, air-conditioned, or shaded place immediately.',
      'Cool them rapidly by applying cold, wet cloths or spraying them with cool water.',
      'Place ice packs or cold wet towels on their neck, armpits, and groin.',
      'Fan the patient vigorously to promote evaporation and cooling.',
      'Call emergency 112/108 immediately.'
    ],
    avoid: [
      'Do not give the patient fluids to drink if they are confused, vomiting, or unconscious.',
      'Do not use ice-cold baths for elderly or frail patients.'
    ],
    recommendation: '🚑 Heat Emergency Medical Unit required.',
    contact: 'Emergency Medical Services (108)',
    warningSigns: 'Seizures, loss of consciousness, body temperature above 104°F'
  },
  {
    id: 'dehydration',
    title: 'Dehydration',
    category: 'GENERAL',
    severity: 'low',
    urgency: 'Low Urgency (Self-rehydration)',
    symptoms: ['Extreme thirst and dry mouth', 'Dark-colored urine and infrequent urination', 'Dizziness, headache, and fatigue'],
    actions: [
      'Rehydrate slowly by sipping Oral Rehydration Salts (ORS) or water.',
      'Move to a cool, shaded environment and rest.',
      'Cool down with wet cloths if body temperature feels high.'
    ],
    avoid: [
      'Do not drink coffee, high-sugar sodas, or alcohol (makes dehydration worse).',
      'Do not drink large quantities of water extremely fast (can cause stomach cramps).'
    ],
    recommendation: '🚑 Standard ambulance not required. Hydration clinic if severe.',
    contact: 'Local Health Center',
    warningSigns: 'Extreme lethargy, sunken eyes, absolute lack of urination for 12 hours'
  },
  {
    id: 'panic-attack',
    title: 'Panic Attack',
    category: 'GENERAL',
    severity: 'low',
    urgency: 'Low Urgency (De-escalation)',
    symptoms: ['Rapid pounding heart rate', 'Hyperventilation or shortness of breath', 'Intense terror, shaking, or sweating', 'Sensation of choking or chest discomfort'],
    actions: [
      'Encourage the patient to sit in a quiet, comfortable space.',
      'Guide them through slow, rhythmic breathing (breathe in for 4s, hold 7s, exhale 8s).',
      'Reassure them calmly that they are safe and the sensation will pass in a few minutes.',
      'Ask them to focus on 5 things they can see, 4 they can touch, 3 they can hear.'
    ],
    avoid: [
      'Do not tell the patient to "calm down" or shout at them.',
      'Do not leave them alone or crowd around them.'
    ],
    recommendation: '🚑 Counseling/medical clinic advice. No emergency dispatch needed.',
    contact: 'Mental Health Helpline',
    warningSigns: 'Chest pain that persists even after breathing exercises (suspect Cardiac)'
  },
  {
    id: 'child-choking',
    title: 'Child Choking',
    category: 'CHILD EMERGENCIES',
    severity: 'critical',
    urgency: 'Immediate (Within 1 min)',
    symptoms: ['Inability to cry, cough, or make sound', 'Universal choking sign (hands to throat)', 'Bluish skin/lips, struggling silently'],
    actions: [
      'If infant (<1 year): Place face down along your forearm supporting head, give 5 firm back blows between shoulder blades. If not cleared, flip and give 5 chest thrusts with 2 fingers.',
      'If child (>1 year): Perform abdominal thrusts (Heimlich Maneuver) standing behind them, using less force than with an adult.',
      'Repeat until the object is expelled or the child becomes unresponsive.',
      'If unresponsive, start child CPR immediately.'
    ],
    avoid: [
      'Do not perform blind finger sweeps in a child\'s throat (can push object further).',
      'Do not use adult-force Heimlich on infants.'
    ],
    recommendation: '🚑 Critical Pediatric Airway Response required.',
    contact: 'Pediatric Care ER (108)',
    warningSigns: 'Silent struggling, turning blue, lack of normal responsiveness'
  },
  {
    id: 'high-fever-in-child',
    title: 'High Fever in Child',
    category: 'CHILD EMERGENCIES',
    severity: 'medium',
    urgency: 'Moderate Urgency (Within 1 hour)',
    symptoms: ['High rectal/oral temp (above 101°F / 38.3°C)', 'Irritability, crying, or lethargy', 'Shivering or cold hands/feet'],
    actions: [
      'Give child Paracetamol or Ibuprofen (specifically formulated pediatric doses based on weight).',
      'Offer frequent fluids (breastmilk, formula, water, ORS) in small quantities.',
      'Dress the child in a single layer of lightweight clothing.',
      'Apply a lukewarm sponge bath if the fever causes notable distress.'
    ],
    avoid: [
      'Do not give Aspirin to children (linked to Reye\'s Syndrome - a brain/liver condition).',
      'Do not use cold water or rubbing alcohol to sponge down a child.'
    ],
    recommendation: '🚑 Pediatric consult advised. No ambulance unless seizure occurs.',
    contact: 'Pediatric Care Helpline',
    warningSigns: 'Febrile seizure (shaking/stiffening), extreme lethargy, rash that doesn\'t fade under glass pressure'
  },
  {
    id: 'pregnancy-emergency',
    title: 'Pregnancy Emergency',
    category: 'WOMEN EMERGENCIES',
    severity: 'critical',
    urgency: 'Immediate (Within 10 mins)',
    symptoms: ['Vaginal bleeding or fluid leakage', 'Severe abdominal pain or cramping', 'Sudden swelling of hands, face, or ankles', 'Extreme dizziness, blurry vision, or contractions'],
    actions: [
      'Call emergency services (112/108) immediately stating pregnancy complications.',
      'Have the mother lie down completely on her LEFT side (improves blood flow to uterus).',
      'Keep her warm, calm, and extremely comfortable.',
      'Loosen any tight clothing and monitor her breathing closely.'
    ],
    avoid: [
      'Do not let the mother walk or exert herself.',
      'Do not administer any medications or foods.'
    ],
    recommendation: '🚑 Critical Obstetric Trauma Ambulance Dispatched.',
    contact: 'Maternity Specialty Unit (108)',
    warningSigns: 'Heavy vaginal bleeding, severe abdominal pain, sudden extreme headache or vision changes'
  },
  {
    id: 'vehicle-collision-trauma',
    title: 'Vehicle Collision Trauma',
    category: 'ROAD ACCIDENT',
    severity: 'critical',
    urgency: 'Immediate (Within 5 mins)',
    symptoms: ['Multiple bleeding wounds, deep cuts, or limb fractures', 'Signs of shock (cold skin, confusion, gasping)', 'Head or neck pain, spinal deformity'],
    actions: [
      'Call 112/108 immediately and secure the accident scene (turn on hazard lights).',
      'Do NOT move any injured victims unless there is an immediate, deadly threat (like fire).',
      'Apply direct pressure to active bleeding wounds using sterile cloths.',
      'Support the head and neck of any victim showing signs of spinal trauma.'
    ],
    avoid: [
      'Do not remove a motorcycle victim\'s helmet unless airway is blocked (causes spinal injury).',
      'Do not pull victims out of crushed vehicles unless highly critical.'
    ],
    recommendation: '🚑 Multi-Trauma Advanced Life Support (ALS) Ambulance.',
    contact: 'Accident Trauma Center (108)',
    warningSigns: 'Uncontrolled hemorrhage, unresponsive patient, crushed chest'
  }
];

const CATEGORIES = [
  { id: 'ALL', label: 'All Emergencies', emoji: '✨' },
  { id: 'CARDIAC', label: 'Cardiac', emoji: '❤️' },
  { id: 'BLEEDING', label: 'Bleeding', emoji: '🩸' },
  { id: 'INJURY', label: 'Injuries', emoji: '🦴' },
  { id: 'BREATHING', label: 'Breathing', emoji: '🫁' },
  { id: 'BURNS', label: 'Burns', emoji: '🔥' },
  { id: 'NEUROLOGICAL', label: 'Neurological', emoji: '🧠' },
  { id: 'GENERAL', label: 'General Illness', emoji: '🌡' },
  { id: 'CHILD EMERGENCIES', label: 'Child Emergencies', emoji: '👶' },
  { id: 'WOMEN EMERGENCIES', label: 'Women Emergencies', emoji: '🤰' },
  { id: 'ROAD ACCIDENT', label: 'Road Accident', emoji: '🚗' },
];

export const MedicalPanel = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Quick Access Chips list
  const QUICK_CHIPS = [
    { title: 'Heart Attack', emoji: '❤️' },
    { title: 'Heavy Bleeding', emoji: '🩸' },
    { title: 'Fire Burn', emoji: '🔥' },
    { title: 'Asthma Attack', emoji: '🫁' },
    { title: 'Stroke', emoji: '🧠' }
  ];

  // Filtered conditions based on selected Category + Search query
  const getFilteredConditions = () => {
    return EMERGENCY_DATABASE.filter(cond => {
      const matchesCategory = selectedCategory === 'ALL' || cond.category === selectedCategory;
      const matchesSearch = !searchQuery.trim() || 
        cond.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cond.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cond.symptoms.some(sym => sym.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  };

  const filteredConditions = getFilteredConditions();

  // Group the filtered conditions by their respective categories visually
  const groupedConditions = CATEGORIES.reduce((acc, cat) => {
    if (cat.id === 'ALL') return acc;
    
    // Only filter for this category if ALL is selected, or if this category specifically is chosen
    const isCategoryAllowed = selectedCategory === 'ALL' || selectedCategory === cat.id;
    if (!isCategoryAllowed) return acc;

    const conditionsInCat = filteredConditions.filter(cond => cond.category === cat.id);
    if (conditionsInCat.length > 0) {
      acc.push({
        category: cat,
        conditions: conditionsInCat
      });
    }
    return acc;
  }, []);

  // Autocomplete matching (constrained strictly by selected category)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      return;
    }

    const matched = EMERGENCY_DATABASE.filter(cond => {
      const matchesCategory = selectedCategory === 'ALL' || cond.category === selectedCategory;
      const matchesSearch = 
        cond.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cond.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cond.symptoms.some(sym => sym.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });

    setSuggestions(matched.slice(0, 5));
    setIsDropdownOpen(true);
    setHighlightedIndex(0);
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleKeyDown = (e) => {
    if (!isDropdownOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        selectCondition(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const selectCondition = (condition) => {
    setSelectedCondition(condition);
    setSearchQuery(condition.title);
    setSelectedCategory(condition.category);
    setIsDropdownOpen(false);
  };

  const handleChipClick = (title) => {
    const condition = EMERGENCY_DATABASE.find(c => c.title === title);
    if (condition) {
      selectCondition(condition);
    }
  };

  const getHighlightedText = (text, highlight) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? <strong key={i} style={{ color: '#ea580c', fontWeight: 900 }}>{part}</strong> : <span key={i}>{part}</span>
        )}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* QUICK CHIPS */}
      <div className="glass-panel" style={{ padding: '1rem' }}>
        <h4 style={{ margin: '0 0 0.6rem 0', fontSize: '0.8rem', color: '#475569', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          ✨ Popular Quick Assists
        </h4>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {QUICK_CHIPS.map(chip => (
            <button
              key={chip.title}
              onClick={() => handleChipClick(chip.title)}
              className="injury-chip"
              style={{
                fontSize: '0.72rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '50px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                background: searchQuery === chip.title ? '#ea580c' : 'rgba(234, 88, 12, 0.05)',
                color: searchQuery === chip.title ? '#ffffff' : '#ea580c',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <span>{chip.emoji}</span>
              <span>{chip.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CATEGORY EXPLORER PILLS SECTION */}
      <div className="glass-panel" style={{ padding: '1rem' }}>
        <h4 style={{ margin: '0 0 0.6rem 0', fontSize: '0.8rem', color: '#475569', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          📂 Category Navigator
        </h4>
        <div 
          style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            overflowX: 'auto', 
            paddingBottom: '0.4rem',
            whiteSpace: 'nowrap',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }}
        >
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedCondition(null);
                  setSearchQuery('');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '12px',
                  border: isSelected ? '1px solid #ea580c' : '1px solid rgba(15, 23, 42, 0.08)',
                  background: isSelected ? 'linear-gradient(135deg, #ea580c, #f97316)' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 4px 10px rgba(234, 88, 12, 0.15)' : 'none',
                  transition: 'all 0.2s',
                  flexShrink: 0
                }}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
                {isSelected && <Check size={12} style={{ marginLeft: '2px' }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* SEARCH BAR WITH COMPREHENSIVE SEARCH INPUT */}
      <div className="glass-panel" style={{ padding: '1.25rem', position: 'relative' }} ref={dropdownRef}>
        <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.85rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <Heart size={15} color="#ef4444" /> Smart Searchable First-Aid Guide
        </h4>
        
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px' }} />
          <input
            type="text"
            className="form-control"
            style={{
              paddingLeft: '36px',
              paddingRight: selectedCondition ? '36px' : '12px',
              fontSize: '0.85rem',
              height: '42px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              width: '100%',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
            }}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (selectedCondition && e.target.value !== selectedCondition.title) {
                setSelectedCondition(null);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Search ${selectedCategory === 'ALL' ? 'all' : selectedCategory.toLowerCase()} emergencies...`}
          />
          {selectedCondition && (
            <button
              onClick={() => {
                setSelectedCondition(null);
                setSearchQuery('');
                setSuggestions([]);
              }}
              style={{
                position: 'absolute',
                right: '12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9ca3af',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* drop-down autocomplete suggestions */}
        {isDropdownOpen && suggestions.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '1.25rem',
              right: '1.25rem',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              marginTop: '4px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              overflow: 'hidden',
              animation: 'fadeIn 0.15s ease-out'
            }}
          >
            {suggestions.map((cond, index) => {
              const isSelected = index === highlightedIndex;
              return (
                <div
                  key={cond.id}
                  onClick={() => selectCondition(cond)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 1rem',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(234, 88, 12, 0.04)' : '#ffffff',
                    borderLeft: isSelected ? '3px solid #ea580c' : '3px solid transparent',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2937' }}>
                      {getHighlightedText(cond.title, searchQuery)}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', marginTop: '2px' }}>
                      {cond.category}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      background: cond.severity === 'critical' ? '#fee2e2' : cond.severity === 'high' ? '#ffedd5' : '#d1fae5',
                      color: cond.severity === 'critical' ? '#dc2626' : cond.severity === 'high' ? '#ea580c' : '#059669'
                    }}
                  >
                    {cond.severity}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* EXPLORE CONDITIONS GRID (GROUPED CATEGORY-WISE INSTEAD OF A MIXED FLAT LIST) */}
      {!selectedCondition && (
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#1e293b', display: 'flex', gap: '0.4rem', alignItems: 'center', fontWeight: 800 }}>
            <LayoutGrid size={15} color="#6366f1" /> Grouped Medical Explorer ({filteredConditions.length} matching)
          </h4>
          
          {groupedConditions.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
              No emergencies found matching the current filters or query.
            </div>
          ) : (
            <div 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1.5rem', 
                maxHeight: '380px', 
                overflowY: 'auto', 
                padding: '4px' 
              }}
            >
              {groupedConditions.map(group => (
                <div key={group.category.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {/* Category Group Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.3rem' }}>
                    <span style={{ fontSize: '1rem' }}>{group.category.emoji}</span>
                    <h5 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {group.category.label}
                    </h5>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: 'auto', fontWeight: 600 }}>
                      {group.conditions.length} condition{group.conditions.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Conditions inside Group */}
                  <div 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                      gap: '0.75rem' 
                    }}
                  >
                    {group.conditions.map(cond => (
                      <div
                        key={cond.id}
                        onClick={() => selectCondition(cond)}
                        style={{
                          padding: '0.8rem',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 15px rgba(0,0,0,0.05)';
                          e.currentTarget.style.borderColor = '#ea580c';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                          e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)';
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1e293b', lineHeight: 1.3 }}>
                            {cond.title}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.8rem' }}>
                          <span
                            style={{
                              fontSize: '0.6rem',
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              background: cond.severity === 'critical' ? '#fee2e2' : cond.severity === 'high' ? '#ffedd5' : '#d1fae5',
                              color: cond.severity === 'critical' ? '#dc2626' : cond.severity === 'high' ? '#ea580c' : '#059669'
                            }}
                          >
                            {cond.severity}
                          </span>
                          <ChevronRight size={14} color="#94a3b8" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DETAILED FIRST AID GUIDANCE CARD */}
      {selectedCondition && (
        <div
          className="glass-panel"
          style={{
            padding: '1.5rem',
            border: `1px solid ${selectedCondition.severity === 'critical' ? '#fecaca' : selectedCondition.severity === 'high' ? '#fed7aa' : '#bbf7d0'}`,
            background: selectedCondition.severity === 'critical' ? 'rgba(239, 68, 68, 0.02)' : '#ffffff',
            borderRadius: '12px',
            animation: 'fadeIn 0.25s ease-out'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                  {selectedCondition.title.toUpperCase()}
                </h3>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    background: selectedCondition.severity === 'critical' ? '#dc2626' : selectedCondition.severity === 'high' ? '#ea580c' : '#059669',
                    color: '#ffffff'
                  }}
                >
                  {selectedCondition.severity}
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px', display: 'block' }}>
                Category: {selectedCondition.category}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>ESTIMATED URGENCY:</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: selectedCondition.severity === 'critical' ? '#dc2626' : '#475569' }}>
                {selectedCondition.urgency}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {/* Symptoms */}
            <div>
              <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '0.8rem', fontWeight: 800, color: '#475569', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                ⚠️ KEY SYMPTOMS
              </h5>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {selectedCondition.symptoms.map((sym, idx) => (
                  <span key={idx} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: '#f1f5f9', color: '#475569', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    • {sym}
                  </span>
                ))}
              </div>
            </div>

            {/* Immediate Actions */}
            <div>
              <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 800, color: '#10b981', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                ✅ IMMEDIATE ACTIONS (FIRST AID STEPS)
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {selectedCondition.actions.map((act, idx) => (
                  <div key={idx} className="med-step active" style={{ cursor: 'default', background: 'rgba(16, 185, 129, 0.03)', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                    <div className="med-step-num" style={{ background: '#10b981' }}>{idx + 1}</div>
                    <div style={{ fontSize: '0.8rem', color: '#1f2937', lineHeight: 1.4 }}>{act}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* What NOT to do */}
            <div>
              <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 800, color: '#ef4444', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                ❌ WHAT NOT TO DO (AVOID)
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {selectedCondition.avoid.map((av, idx) => (
                  <div key={idx} style={{ fontSize: '0.78rem', color: '#b91c1c', display: 'flex', gap: '0.4rem', background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                    <span>{av}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Warning Signs & Recommendations */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800 }}>CRITICAL WARNING SIGNS:</div>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#b91c1c', fontWeight: 700, lineHeight: 1.3 }}>
                  🚨 {selectedCondition.warningSigns}
                </p>
              </div>
              <div style={{ background: 'rgba(234, 88, 12, 0.03)', border: '1px solid rgba(234, 88, 12, 0.1)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.7rem', color: '#ea580c', fontWeight: 800 }}>DISPATCH RECOMMENDATION:</div>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#1e3a8a', fontWeight: 700, lineHeight: 1.3 }}>
                  {selectedCondition.recommendation}
                </p>
              </div>
            </div>

            {/* Helpline contact info */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PhoneCall size={16} color="#6366f1" />
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Recommended Helpline</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Dedicated medical coordinator</div>
                </div>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#6366f1' }}>
                {selectedCondition.contact}
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export const InjurySelector = ({ onChange }) => {
  const [selected, setSelected] = useState([]);
  const options = ['🩸 Bleeding', '😵 Unconscious', '🔒 Trapped', '🔥 Fire Injury', '👥 Multiple Victims', '🦴 Fracture', '💊 Allergic Reaction'];

  const toggle = (o) => {
    const next = selected.includes(o) ? selected.filter(x => x !== o) : [...selected, o];
    setSelected(next);
    onChange && onChange(next);
  };

  return (
    <div className="glass-panel" style={{ padding: '1.25rem' }}>
      <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <Heart size={15} color="#ef4444" /> Smart Injury Selector
      </h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {options.map(o => (
          <button key={o} onClick={() => toggle(o)} className={`injury-chip ${selected.includes(o) ? 'selected' : ''}`}>{o}</button>
        ))}
      </div>
      {selected.length > 0 && (
        <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>
          Dispatch priority updated for: {selected.length} injury type{selected.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

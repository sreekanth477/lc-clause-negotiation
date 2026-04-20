import { storeKnowledgeChunk, countKnowledgeChunks } from './vectorStore.service';

const UCP600_ARTICLES = [
  {
    source: 'UCP600',
    articleRef: 'ART_01',
    title: 'Article 1 – Application of UCP',
    content:
      'UCP 600 applies to any documentary credit ("credit") when the text of the credit expressly indicates that it is subject to these rules. They are binding on all parties thereto unless expressly modified or excluded by the credit. The Uniform Customs and Practice for Documentary Credits, 2007 Revision, ICC Publication No. 600 ("UCP") are rules that apply to any documentary credit ("credit") (including, to the extent to which they may be applicable, any standby letter of credit) when the text of the credit expressly indicates that it is subject to these rules.',
  },
  {
    source: 'UCP600',
    articleRef: 'ART_02',
    title: 'Article 2 – Definitions',
    content:
      'Key definitions under UCP 600:\n- Advising bank: bank that advises the credit at the request of the issuing bank.\n- Applicant: party on whose request the credit is issued.\n- Banking day: day on which a bank is regularly open at the place at which an act subject to these rules is to be performed.\n- Beneficiary: party in whose favour a credit is issued.\n- Complying presentation: presentation that is in accordance with the terms and conditions of the credit, the applicable provisions of these rules and international standard banking practice.\n- Confirmation: definite undertaking of the confirming bank, in addition to that of the issuing bank, to honour or negotiate a complying presentation.\n- Credit: any arrangement that is irrevocable and thereby constitutes a definite undertaking of the issuing bank to honour a complying presentation.\n- Honour: to pay at sight if the credit is available by sight payment; to incur a deferred payment undertaking and pay at maturity if the credit is available by deferred payment; to accept a bill of exchange drawn by the beneficiary and pay at maturity if the credit is available by acceptance.\n- Issuing bank: bank that issues a credit at the request of an applicant or on its own behalf.\n- Negotiation: purchase by the nominated bank of drafts and/or documents under a complying presentation by advancing or agreeing to advance funds to the beneficiary on or before the banking day on which reimbursement is due to the nominated bank.\n- Nominated bank: bank with which the credit is available or any bank in the case of a credit available with any bank.\n- Presentation: delivery of documents under a credit to the issuing bank or nominated bank.\n- Presenter: beneficiary, bank, or other party that makes a presentation.',
  },
  {
    source: 'UCP600',
    articleRef: 'ART_04',
    title: 'Article 4 – Credits vs. Contracts',
    content:
      'A credit by its nature is a separate transaction from the sale or other contract on which it may be based. Banks are in no way concerned with or bound by such contract, even if any reference whatsoever to it is included in the credit. Consequently, the undertaking of a bank to honour, to negotiate, or to fulfil any other obligation under the credit is not subject to claims or defences by the applicant resulting from its relationships with the issuing bank or the beneficiary. A beneficiary can in no case avail itself of the contractual relationships existing between banks or between the applicant and the issuing bank. An issuing bank should discourage any attempt by the applicant to include, as an integral part of the credit, copies of the underlying contract, proforma invoice and the like.',
  },
  {
    source: 'UCP600',
    articleRef: 'ART_05',
    title: 'Article 5 – Documents vs. Goods, Services or Performance',
    content:
      'Banks deal with documents and not with goods, services or performance to which the documents may relate. This is a fundamental principle of documentary credit practice. Banks examine documents presented under a credit solely to determine, on the basis of the documents alone, whether or not the documents appear on their face to constitute a complying presentation. Documents presented must comply strictly with the terms and conditions of the credit. Any clause making payment dependent on applicant inspection or approval of goods violates this principle.',
  },
  {
    source: 'UCP600',
    articleRef: 'ART_07',
    title: 'Article 7 – Issuing Bank Undertaking',
    content:
      'Provided that the stipulated documents are presented to the nominated bank or to the issuing bank and that they constitute a complying presentation, the issuing bank must honour if the credit is available by sight payment, deferred payment or acceptance with the issuing bank; if the credit is available by sight payment with a nominated bank and that nominated bank does not pay; if the credit is available by deferred payment with a nominated bank and that nominated bank does not incur its deferred payment undertaking or, having incurred its deferred payment undertaking, does not pay at maturity; if the credit is available by acceptance with a nominated bank and that nominated bank does not accept a draft drawn on it or, having accepted a draft drawn on it, does not pay at maturity; if the credit is available by negotiation with a nominated bank and that nominated bank does not negotiate. An issuing bank is irrevocably bound to honour as of the time it issues the credit.',
  },
  {
    source: 'UCP600',
    articleRef: 'ART_09',
    title: 'Article 9 – Advising of Credits and Amendments',
    content:
      'A credit and any amendment may be advised to a beneficiary through an advising bank. An advising bank that is not a confirming bank advises the credit and any amendment without any undertaking to honour or negotiate. By advising the credit or amendment, the advising bank signifies that it has satisfied itself as to the apparent authenticity of the credit or amendment and that the advice accurately reflects the terms and conditions of the credit or amendment received. An advising bank may utilize the services of another bank to advise the credit and any amendment to the beneficiary.',
  },
  {
    source: 'UCP600',
    articleRef: 'ART_14',
    title: 'Article 14 – Standard for Examination of Documents',
    content:
      'A nominated bank acting on its nomination, a confirming bank, if any, and the issuing bank must examine a presentation to determine, on the basis of the documents alone, whether or not the documents appear on their face to constitute a complying presentation. A nominated bank acting on its nomination, a confirming bank, if any, and the issuing bank shall each have a maximum of five banking days following the day of presentation to determine if a presentation is complying. Article 14(c): A presentation including one or more original transport documents subject to articles 19, 20, 21, 22, 23, 24 or 25 must be made by or on behalf of the beneficiary not later than 21 calendar days after the date of shipment as described in these rules, but in any event not later than the expiry date of the credit. Article 14(d): Data in a document, when read in context with the credit, the document itself and international standard banking practice, need not be identical to, but must not conflict with, data in that document, any other stipulated document, or the credit.',
  },
  {
    source: 'UCP600',
    articleRef: 'ART_15',
    title: 'Article 15 – Complying Presentation',
    content:
      'When an issuing bank determines that a presentation is complying, it must honour. When a confirming bank determines that a presentation is complying, it must honour or negotiate and forward the documents to the issuing bank. When a nominated bank determines that a presentation is complying and honours or negotiates, it must forward the documents to the confirming bank or issuing bank.',
  },
  {
    source: 'UCP600',
    articleRef: 'ART_16',
    title: 'Article 16 – Discrepant Documents, Waiver and Notice',
    content:
      'When a nominated bank acting on its nomination, a confirming bank, if any, or the issuing bank determines that a presentation does not comply, it may refuse to honour or negotiate. When an issuing bank or a confirming bank determines that a presentation does not comply, it may in its sole judgement approach the applicant for a waiver of the discrepancies. This does not, however, extend the period mentioned in article 14(b). When a nominated bank acting on its nomination, a confirming bank, if any, or the issuing bank decides to refuse to honour or negotiate, it must give a single notice to that effect to the presenter. The notice must state each discrepancy in respect of which the bank refuses to honour or negotiate. The notice must be given by telecommunication or, if not possible, by other expeditious means no later than the close of the fifth banking day following the day of presentation.',
  },
  {
    source: 'UCP600',
    articleRef: 'ART_18',
    title: 'Article 18 – Commercial Invoice',
    content:
      'A commercial invoice must appear to have been issued by the beneficiary (except as provided in article 38). The commercial invoice must be made out in the name of the applicant (except as provided in sub-article 38(g)). A commercial invoice need not be signed. A nominated bank that is not a confirming bank may forward an invoice that appears to have been issued by a person other than the beneficiary. The description of the goods, services or performance in a commercial invoice must correspond with that appearing in the credit. In all other documents, the description of the goods, services or performance may be in general terms not conflicting with their description in the credit.',
  },
  {
    source: 'UCP600',
    articleRef: 'ART_19',
    title: 'Article 19 – Transport Document Covering at Least Two Modes of Transport',
    content:
      'A transport document covering at least two different modes of transport (multimodal or combined transport document), however named, must appear to indicate the name of the carrier and be signed by the carrier or a named agent for or on behalf of the carrier; indicate that the goods have been dispatched, taken in charge or shipped on board at the place stated in the credit; indicate the place of taking in charge; and indicate the place of final destination. All original transport documents (or, as indicated in the document, the full set of originals) must be presented.',
  },
  {
    source: 'UCP600',
    articleRef: 'ART_20',
    title: 'Article 20 – Bill of Lading',
    content:
      'A bill of lading, however named, must appear to indicate the name of the carrier and be signed by the carrier or a named agent for or on behalf of the carrier, or the master or a named agent for or on behalf of the master. Any signature by the carrier, master or agent must be identified as that of the carrier, master or agent. An on board notation must indicate the name of the vessel, the port of loading and the date of on board shipment if not already stated on the face of the bill of lading. The bill of lading must indicate the port of loading and the port of discharge stated in the credit, even if it indicates a place of receipt or place of final destination different from the port of loading or port of discharge. The bill of lading must be the sole original bill of lading or, if issued in more than one original, be the full set as indicated on the bill of lading.',
  },
  {
    source: 'UCP600',
    articleRef: 'ART_22',
    title: 'Article 22 – Charter Party Bill of Lading',
    content:
      'A bill of lading, however named, containing an indication that it is subject to a charter party (charter party bill of lading), must appear to be signed by the master or a named agent for or on behalf of the master, or the owner or a named agent for or on behalf of the owner, or the charterer or a named agent for or on behalf of the charterer. Any signature by the master, owner, charterer or agent must be identified as that of the master, owner, charterer or agent, as the case may be. A bank will not examine charter party contracts, even if they are required to be presented by the terms of the credit.',
  },
  {
    source: 'UCP600',
    articleRef: 'ART_28',
    title: 'Article 28 – Insurance Document and Coverage',
    content:
      'An insurance document, such as an insurance policy, an insurance certificate or a declaration under an open cover, must appear to be issued and signed by an insurance company, an underwriter or their agents or their proxies. Any signature by an agent or proxy must indicate whether the agent or proxy has signed for or on behalf of the insurance company or underwriter. The insurance document must indicate the amount of insurance coverage and be in the same currency as the credit. The insurance document must be for a minimum coverage of 110 percent of the CIF or CIP value of the goods. Insurance documents must be dated no later than the date of shipment, unless it appears from the insurance document that the coverage is effective from a date not later than the date of shipment.',
  },
  {
    source: 'UCP600',
    articleRef: 'ART_29',
    title: 'Article 29 – Extension of Expiry Date or Last Day for Presentation',
    content:
      'If the expiry date of a credit or the last day for presentation falls on a day when the bank to which presentation is to be made is closed for reasons other than those referred to in article 36, the expiry date or the last day for presentation, as the case may be, will be extended to the first following banking day. If presentation is made on the first following banking day, a nominated bank must provide the issuing bank or confirming bank with a statement on its covering schedule that the presentation was made within the time limits extended in accordance with sub-article 29(a).',
  },
  {
    source: 'UCP600',
    articleRef: 'ART_30',
    title: 'Article 30 – Tolerance in Credit Amount, Quantity and Unit Prices',
    content:
      'The words "about" or "approximately" used in connection with the amount of the credit or the quantity or the unit price stated in the credit are to be construed as allowing a tolerance not to exceed 10% more or 10% less than the amount, the quantity or the unit price to which they refer. A tolerance not to exceed 5% more or 5% less than the quantity of the goods is allowed, provided the credit does not state the quantity in terms of a stipulated number of packing units or individual items and the total amount of the drawings does not exceed the amount of the credit. Even when partial shipments are not allowed, a tolerance not to exceed 5% less than the amount of the credit is allowed, provided that the quantity of the goods, if stated in the credit, is shipped in full and a unit price, if stated in the credit, is not reduced or that sub-article 30(b) is not applicable.',
  },
  {
    source: 'UCP600',
    articleRef: 'ART_31',
    title: 'Article 31 – Partial Drawings or Shipments',
    content:
      'Partial drawings or shipments are allowed. A presentation consisting of more than one set of transport documents evidencing shipment on more than one means of conveyance within the same mode of transport will be considered a partial shipment, even if the means of conveyance depart on the same day for the same destination. A presentation consisting of more than one set of transport documents evidencing shipment on more than one vessel within the same mode of transport will be considered a partial shipment, even if the vessels depart on the same day for the same destination.',
  },
  {
    source: 'UCP600',
    articleRef: 'ART_36',
    title: 'Article 36 – Force Majeure',
    content:
      'A bank assumes no liability or responsibility for the consequences arising out of the interruption of its business by Acts of God, riots, civil commotions, insurrections, wars, acts of terrorism, or by any strikes or lockouts or any other causes beyond its control. A bank will not, upon resumption of its business, honour or negotiate under a credit that expired during such interruption of its business.',
  },
  {
    source: 'UCP600',
    articleRef: 'ART_37',
    title: 'Article 37 – Disclaimer on the Transmission of Messages',
    content:
      'A bank assumes no liability or responsibility for the consequences arising out of delay, loss in transit, mutilation or other errors arising in the transmission of any messages or delivery of letters or documents, when such messages, letters or documents are transmitted or sent according to the requirements stated in the credit, or when the bank may have taken the initiative in the choice of the delivery service in the absence of such instructions in the credit. If a nominated bank determines that a presentation is complying and forwards the documents to the issuing bank or confirming bank, whether or not the nominated bank has honoured or negotiated, an issuing bank or confirming bank must honour or negotiate, or reimburse that nominated bank, even when the documents have been lost in transit between the nominated bank and the issuing bank or confirming bank, or between the confirming bank and the issuing bank.',
  },
  {
    source: 'UCP600',
    articleRef: 'ART_38',
    title: 'Article 38 – Transferable Credits',
    content:
      'A bank is under no obligation to transfer a credit except to the extent and in the manner expressly consented to by that bank. For the purpose of this article: A transferable credit means a credit that specifically states it is "transferable". A transferring bank means a nominated bank that transfers the credit, or, in a credit available with any bank, a bank that is specifically authorized by the issuing bank to transfer and that transfers the credit. A transferred credit means a credit that has been made available by the transferring bank to a second beneficiary. A transferable credit may be transferred in part to one or more second beneficiaries. Transfer is only allowed at the terms and conditions specified in the original credit, with certain exceptions.',
  },
  {
    source: 'UCP600',
    articleRef: 'ART_39',
    title: 'Article 39 – Assignment of Proceeds',
    content:
      'The fact that a credit is not stated to be transferable shall not affect the right of the beneficiary to assign any proceeds to which it may be or may become entitled under the credit, in accordance with the provisions of applicable law. This article relates only to the assignment of proceeds and not to the assignment of the right to perform under the credit. Assignment of proceeds means the beneficiary may direct that payment be made to a third party (assignee) but unlike a transfer, the assignee has no right to make a presentation under the credit.',
  },
];

const ISBP821_PARAGRAPHS = [
  {
    source: 'ISBP821',
    articleRef: 'PARA_A1_A7',
    title: 'ISBP 821 – General Principles (A1–A7)',
    content:
      'A1. Each document must be examined to determine whether its data content and format comply with the terms and conditions of the credit, UCP 600 and the applicable provisions of ISBP 821.\nA2. Documents presented under a credit must be consistent with each other. A document need not use the exact same language as the credit provided the data content and format are consistent with and do not conflict with the terms and conditions of the credit.\nA3. An exporter, shipper, consignor, or similar party named in a document other than the beneficiary is acceptable even if the credit requires the beneficiary to be the shipper, unless the credit expressly requires the documents to show the beneficiary as shipper.\nA4. Misspellings or typing errors that do not affect the meaning of a word or the sentence in which it appears do not make a document discrepant. For example, a description reading "mashine" instead of "machine" would not constitute a discrepancy but a description reading "fountain pen" instead of "fountain pump" would be a discrepancy.\nA5. A document may be dated prior to the issuance date of the credit, but must not be dated later than its date of presentation.\nA6. Documents presented under a credit may bear reference to the credit, contract, purchase order, invoice number, or other similar notation, provided such references do not conflict with data in documents required by the credit.\nA7. Addresses of the beneficiary and the applicant appearing in any stipulated document need not be the same as those stated in the credit or in any other stipulated document, but must be within the same country as the respective addresses mentioned in the credit.',
  },
  {
    source: 'ISBP821',
    articleRef: 'PARA_B1_B15',
    title: 'ISBP 821 – Bill of Lading Requirements (B1–B15)',
    content:
      'B1. An original bill of lading is one that appears to be an original issued by or on behalf of the carrier or its agent.\nB2. UCP 600 article 20(a)(ii) requires that the bill of lading must indicate the port of loading and the port of discharge stated in the credit. Where the credit specifies a range of ports, the bill of lading must indicate the specific port used.\nB3. An on board notation must contain the name of the vessel and the date of shipment, unless the bill of lading itself already contains that information.\nB4. An on board notation appearing on the bill of lading must be dated and signed, or initialled, by the carrier or its named agent.\nB5. A "shipped on board" bill of lading is one that states the goods have been loaded on board the named vessel. A "received for shipment" bill of lading is one that states the goods have been received for shipment but not necessarily loaded on board.\nB6. Consignee instructions must match the credit. If the credit requires "to order" or "to order of shipper", the bill of lading must so state.\nB7. Notify party may be shown as requested in the credit. If the credit does not indicate any notify party, the bill of lading may or may not contain such data.\nB8. Freight prepaid or freight collect: if the credit states freight prepaid or freight to be prepaid, the bill of lading must evidence that freight is prepaid.\nB9. A clean bill of lading is one that does not bear a clause or notation that expressly declares a defective condition of the goods or their packaging.\nB10. A bill of lading indicating "said to contain", "shipper load and count", or similar expressions is acceptable.\nB11. A bill of lading with superimposed clauses stating damage or contamination is not clean and is not acceptable unless the credit specifically calls for such a bill of lading.\nB12. Bill of lading date is the date of shipment unless an on board notation bears a different date.\nB13. A transhipment bill of lading is acceptable if transhipment is not prohibited by the credit.\nB14. A set of originals must include all originals issued, the number of which is stated on the bill of lading itself.\nB15. A stale bill of lading (one presented more than 21 calendar days after the date of shipment) is discrepant unless the credit specifically allows a longer presentation period.',
  },
  {
    source: 'ISBP821',
    articleRef: 'PARA_C1_C12',
    title: 'ISBP 821 – Commercial Invoice Requirements (C1–C12)',
    content:
      'C1. A commercial invoice must be made out in the name of the applicant unless the credit states otherwise.\nC2. The description of goods, services or performance on the commercial invoice must correspond with that in the credit. No other document need contain such a precise description, provided the data is not conflicting.\nC3. The goods description on the invoice must not contain additional information that conflicts with the credit.\nC4. The currency of the invoice must be the same as the credit.\nC5. The unit price, quantity and total amount must be clearly stated and consistent with other documents and the credit.\nC6. If the credit requires "Signed Commercial Invoice", the invoice must bear a signature.\nC7. An invoice must not evidence the payment or part-payment of the credit amount unless the credit permits this.\nC8. A commercial invoice showing an amount in excess of the credit amount is not acceptable, subject to UCP 600 sub-article 18(b).\nC9. An invoice issued before the credit issuance date is acceptable provided its date is not later than the shipment date.\nC10. Trade terms (Incoterms) must be stated as required by the credit.\nC11. HS codes, tariff classifications, or other additional data on an invoice does not make it discrepant.\nC12. An invoice must not require authentication, legalization, or consularization unless the credit so requires.',
  },
  {
    source: 'ISBP821',
    articleRef: 'PARA_D1_D8',
    title: 'ISBP 821 – Insurance Document Requirements (D1–D8)',
    content:
      "D1. The insurance document must be issued and signed by an insurance company, underwriter, or their agent or proxy.\nD2. The insurance document must be in the same currency as the credit.\nD3. The minimum coverage amount must be at least 110% of the CIF or CIP value of the goods.\nD4. The coverage must be effective no later than the date of shipment.\nD5. The risks covered must be those required by the credit. If the credit does not specify, the insurance document must cover the standard risks stipulated in the credit terms.\nD6. An insurance policy is acceptable in lieu of an insurance certificate or declaration under open cover, but not vice versa unless the credit permits.\nD7. A broker's cover note is not acceptable as an insurance document unless the credit specifically permits it.\nD8. If the credit requires 'Institute Cargo Clauses (A)' or 'All Risks' coverage, the document must evidence such coverage.",
  },
  {
    source: 'ISBP821',
    articleRef: 'PARA_K1_K8',
    title: 'ISBP 821 – Packing List Requirements (K1–K8)',
    content:
      'K1. A packing list must be consistent with the commercial invoice and bill of lading.\nK2. The packing list must show the contents, number of packages, gross and net weights, and dimensions as required by the credit.\nK3. If the credit does not specify the format of a packing list, any format is acceptable provided it contains the required information.\nK4. Marks and numbers on the packing list must be consistent with those on the bill of lading and other transport documents.\nK5. A packing list may bear the same date as the commercial invoice or an earlier date, but must not be dated after the bill of lading date.\nK6. If a combined packing and weight list is presented when only a packing list is required, or vice versa, it is acceptable.\nK7. A packing list need not indicate the port of loading or discharge unless specifically required by the credit.\nK8. A packing list does not need to be signed unless the credit specifically requires a signed packing list.',
  },
];

export async function seedUCP600Knowledge(): Promise<void> {
  console.log('Checking existing knowledge chunks...');
  const existingCount = await countKnowledgeChunks();

  if (existingCount > 0) {
    console.log(`Knowledge base already seeded with ${existingCount} chunks. Skipping.`);
    return;
  }

  console.log('Seeding UCP 600 knowledge base...');
  let seeded = 0;

  for (const article of UCP600_ARTICLES) {
    try {
      await storeKnowledgeChunk(
        article.source,
        article.articleRef,
        article.title,
        article.content
      );
      seeded++;
      console.log(`  ✓ Seeded: ${article.title}`);
    } catch (error) {
      console.error(`  ✗ Failed to seed ${article.title}:`, error);
    }
  }

  console.log('Seeding ISBP 821 knowledge base...');
  for (const para of ISBP821_PARAGRAPHS) {
    try {
      await storeKnowledgeChunk(
        para.source,
        para.articleRef,
        para.title,
        para.content
      );
      seeded++;
      console.log(`  ✓ Seeded: ${para.title}`);
    } catch (error) {
      console.error(`  ✗ Failed to seed ${para.title}:`, error);
    }
  }

  console.log(`\nKnowledge base seeding complete: ${seeded} chunks stored.`);
}

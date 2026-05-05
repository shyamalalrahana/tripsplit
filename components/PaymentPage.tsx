"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { LoadingCard } from "@/components/LoadingCard";
import { formatMoney } from "@/lib/calculations";
import { supabase } from "@/lib/supabase";
import type { Settlement, Trip, TripMember } from "@/lib/types";
import { buildUpiLink } from "@/lib/upi";

export function PaymentPage({ tripId, settlementId }: { tripId: string; settlementId: string }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [from, setFrom] = useState<TripMember | null>(null);
  const [to, setTo] = useState<TripMember | null>(null);

  useEffect(() => {
    load();
  }, [tripId, settlementId]);

  async function load() {
    const { data: tripData } = await supabase.from("trips").select("*").eq("id", tripId).single();
    const { data: settlementData } = await supabase.from("settlements").select("*").eq("id", settlementId).single();
    setTrip(tripData);
    setSettlement(settlementData);
    if (settlementData) {
      const { data: members } = await supabase.from("trip_members").select("*").in("id", [settlementData.from_member_id, settlementData.to_member_id]);
      setFrom((members || []).find((member) => member.id === settlementData.from_member_id) || null);
      setTo((members || []).find((member) => member.id === settlementData.to_member_id) || null);
    }
  }

  async function markPaid() {
    await supabase.from("settlements").update({ status: "paid_by_sender", paid_at: new Date().toISOString() }).eq("id", settlementId);
    load();
  }

  async function confirmReceived() {
    await supabase.from("settlements").update({ status: "confirmed_by_receiver", confirmed_at: new Date().toISOString() }).eq("id", settlementId);
    load();
  }

  if (!trip || !settlement || !from || !to) return <AppShell tripId={tripId}><LoadingCard label="Loading payment" /></AppShell>;

  const note = settlement.payment_note || `TripSplit - ${trip.name}`;
  const upiLink = to.upi_id
    ? buildUpiLink({ upiId: to.upi_id, receiverName: to.name, amount: Number(settlement.amount), currency: trip.currency, note })
    : "";

  return (
    <AppShell tripId={tripId}>
      <section className="heroGrid">
        <div className="card grid">
          <p className="kicker">UPI QR payment</p>
          <h1>{from.name} pays {to.name}</h1>
          <h2>{formatMoney(Number(settlement.amount), trip.currency)}</h2>
          <p className="muted">Scan QR to pay with any UPI app. TripSplit cannot automatically verify payment yet, so confirmation is manual.</p>
          <div className="grid">
            <div className="row"><span>Receiver</span><b>{to.name}</b></div>
            <div className="row"><span>UPI ID</span><b>{to.upi_id || "Not added"}</b></div>
            <div className="row"><span>Payment note</span><b>{note}</b></div>
            <div className="row"><span>Status</span><span className="badge paid">{settlement.status}</span></div>
          </div>
          <div className="cluster">
            {upiLink ? <a className="button" href={upiLink}>Pay Now</a> : <span className="badge pending">Receiver needs to add UPI ID</span>}
            <button className="buttonSecondary" onClick={markPaid} type="button">I have paid</button>
            <button className="buttonGreen" onClick={confirmReceived} type="button">Receiver Confirmed</button>
          </div>
        </div>
        <div className="card grid">
          <h2>Scan QR</h2>
          <div className="qrBox">
            {upiLink ? <QRCodeSVG value={upiLink} size={240} includeMargin /> : <p className="muted">No QR yet. Add receiver UPI ID.</p>}
          </div>
          <p className="muted">Works with Google Pay, PhonePe, Paytm, BHIM, and other UPI apps.</p>
        </div>
      </section>
    </AppShell>
  );
}

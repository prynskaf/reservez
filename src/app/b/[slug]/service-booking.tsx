"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

type Svc = { id: string; name: string; duration: number; priceCents: number };

export default function ServiceBooking({
  businessSlug,
  currency,
  services,
}: {
  businessSlug: string;
  currency: string;
  services: Svc[];
}) {
  const [serviceId, setServiceId] = useState<string>(services[0]?.id ?? "");
  const [date, setDate] = useState<string>(() => {
    const d = new Date(); d.setHours(0,0,0,0);
    return d.toISOString().slice(0,10); // YYYY-MM-DD
  });
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const selectedService = useMemo(
    () => services.find(s => s.id === serviceId),
    [serviceId, services]
  );

  console.log("Selected Service:", selectedService); // Example usage to avoid unused variable error

  const loadSlots = useCallback(async () => {
    if (!serviceId || !date) return;
    setLoadingSlots(true);
    setSlots([]);
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessSlug, serviceId, date }),
    });
    const data = await res.json();
    setSlots(data.slots ?? []);
    setLoadingSlots(false);
  }, [businessSlug, serviceId, date]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  // Simple form state for customer details + picked slot
  const [pickedISO, setPickedISO] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  async function pay() {
    if (!pickedISO || !name || !email || !serviceId) return alert("Fill all fields");
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessSlug,
        serviceId,
        customerName: name,
        customerEmail: email,
        startsAt: pickedISO,
      }),
    });
    const data = await res.json();
    if (data?.url) window.location.href = data.url;
    else alert("Failed to start checkout");
  }

  return (
    <div className="space-y-6">
      {/* Service picker */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Services</h2>
        <div className="space-y-2">
          {services.map(s => (
            <button
              key={s.id}
              onClick={() => setServiceId(s.id)}
              className={`w-full border rounded p-3 text-left flex items-center justify-between
                ${serviceId === s.id ? "border-black" : "border-gray-200"}`}
            >
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-sm text-gray-500">{s.duration} min</div>
              </div>
              <div className="font-semibold">
                {currency === "EUR" ? "€" : ""}{(s.priceCents / 100).toFixed(2)}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Date picker */}
      <section>
        <h3 className="font-semibold mb-2">Choose a date</h3>
        <input
          type="date"
          value={date}
          onChange={(e) => { setDate(e.target.value); setPickedISO(""); }}
          className="border rounded px-3 py-2"
        />
      </section>

      {/* Slots */}
      <section>
        <h3 className="font-semibold mb-2">Available times</h3>
        {loadingSlots ? (
          <div className="text-sm text-gray-500">Loading slots…</div>
        ) : slots.length === 0 ? (
          <div className="text-sm text-gray-500">No slots for this date.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {slots.map(iso => {
              const d = new Date(iso);
              const label = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              return (
                <button
                  key={iso}
                  onClick={() => setPickedISO(iso)}
                  className={`border rounded px-3 py-2
                    ${pickedISO === iso ? "border-black" : "border-gray-200"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Customer details */}
      <section className="space-y-2">
        <h3 className="font-semibold">Your details</h3>
        <input
          placeholder="Your name"
          className="w-full border rounded px-3 py-2"
          value={name} onChange={e => setName(e.target.value)}
        />
        <input
          placeholder="Email"
          className="w-full border rounded px-3 py-2"
          value={email} onChange={e => setEmail(e.target.value)}
        />
      </section>

      {/* Pay */}
      <div>
        <button
          onClick={pay}
          disabled={!pickedISO || !name || !email || !serviceId}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          Pay & Confirm
        </button>
      </div>
    </div>
  );
}

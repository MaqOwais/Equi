# Feature: Crisis Mode

Full-screen overlay providing immediate access to emergency contacts, national crisis lines, and quick grounding activities. Always one tap away from any screen.

← [Design index](../wireframes.md)

---

<details>
<summary>View wireframe</summary>

> Triggered by the "I'm not okay" button on Home, or a long-press anywhere in the app.

```
┌─────────────────────────────┐
│                             │
│  ╔═════════════════════════╗ │
│  ║                         ║ │
│  ║    You are not alone.   ║ │
│  ║                         ║ │
│  ║   Take a slow breath.   ║ │
│  ║   We're here with you.  ║ │
│  ║                         ║ │
│  ╚═════════════════════════╝ │
│                             │
│   ┌─────────────────────┐   │
│   │   📞 Call a Contact │   │  ← primary action
│   └─────────────────────┘   │
│                             │
│  YOUR CONTACTS              │
│  ┌───────────────────────┐  │
│  │  👤 Mom               │  │
│  │  +1 (555) 000-0001    │  │
│  │                [Call] │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  👤 Dad               │  │
│  │  +1 (555) 000-0002    │  │
│  │                [Call] │  │
│  └───────────────────────┘  │
│                             │
│  CRISIS LINES               │
│  ┌───────────────────────┐  │
│  │  🆘 988 Lifeline       │  │
│  │  Call or text 988     │  │
│  │  24/7 · Free          │  │
│  │                [Call] │  │
│  ├───────────────────────┤  │
│  │  💬 Crisis Text Line  │  │
│  │  Text HOME to 741741  │  │
│  │                 [Text]│  │
│  └───────────────────────┘  │
│                             │
│  QUICK GROUNDING            │
│  ┌───────────────────────┐  │
│  │  🖐  54321 Grounding  │  │
│  │  Start right now (5m) │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  🫁  1-Min Breathing  │  │
│  └───────────────────────┘  │
│                             │
│  ← Back to app              │
└─────────────────────────────┘
```

</details>

---

## Design Notes

**No red in the UI** — Crisis Mode uses the app's standard color palette. Red is reserved for genuine crisis/emergency UI only (Design Principle #1), but even here the focus is calm, not alarm.

**Emergency contacts** shown here are the same ones configured in Onboarding (Slide 5) and the Support Network screen. Guardians designated as SOS contacts appear first.

**Grounding activities** launch directly from the Crisis Mode screen without navigating away — the user stays in the safe space.

/* ============================================================
   FLEXAGO MULTILINGUAL ENGINE — NORMALIZED CORE
   Works for Sender, Traveler, Explorer
   ============================================================ */

/* Supported languages (for now: English only) */
const LANGUAGES = ["en"];

/* Active language (default English) */
let activeLang = "en";

/* ============================================================
   KEY RESOLUTION (supports nested keys: "sender.nav.title")
   ============================================================ */
function resolveKey(obj, path) {
  return path.split(".").reduce((acc, key) => {
    if (acc && acc[key] !== undefined) return acc[key];
    return undefined;
  }, obj);
}

/* ============================================================
   t() — SAFE TRANSLATION LOOKUP
   ============================================================ */
function t(key) {
  if (!key) return "";

  const langPack = translations[activeLang];
  const value = resolveKey(langPack, key);
  if (value !== undefined) return value;

  console.warn(`Missing translation: ${activeLang}.${key}`);
  return key;
}

/* ============================================================
   APPLY TRANSLATIONS TO DOM
   ============================================================ */
function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    const translated = t(key);
    if (translated) el.textContent = translated;
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    const translated = t(key);
    if (translated) el.setAttribute("placeholder", translated);
  });

  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    const key = el.getAttribute("data-i18n-title");
    const translated = t(key);
    if (translated) el.setAttribute("title", translated);
  });
}

/* ============================================================
   TRANSLATION DICTIONARY — ENGLISH ONLY (SENDER + TRAVELER)
   ============================================================ */
const translations = {
  en: {
    sender: {
      nav: {
        title: "Flexago Delivery",
        subtitle: "Logistics marketplace for senders",
        env: "SANDBOX",
        version: "v1.0.0",
        searchPlaceholder: "Search deliveries, travelers, routes..."
      },
      sidebar: {
        section: "Sender Workspace",
        account: "Account & Identity",
        create: "Create Delivery",
        track: "Track Delivery",
        payouts: "Payouts",
        verification: "Verification",
        support: "Support",
        footer: "Connected to the Flexago logistics network."
      },
      account: {
        title: "Account & Identity",
        subtitle: "Manage your personal information and identity details.",
        change_photo: "Change Photo",
        deliveries: "deliveries",
        joined: "Joined",
        verified_title: "Verified Information",
        verified: "✔ Verified",
        phone: "Phone Number",
        email: "Email",
        identity: "Identity Check",
        personal_title: "Personal Information",
        first_name: "First Name",
        last_name: "Last Name",
        save: "Save Changes"
      },
      verification: {
        title: "Verification",
        subtitle: "Verify your identity to access all Flexago features.",
        status_unverified: "Unverified",
        id_front_title: "Upload ID (Front)",
        id_front_label: "Upload front side of your ID",
        id_back_title: "Upload ID (Back)",
        id_back_label: "Upload back side of your ID",
        selfie_title: "Selfie for Verification",
        selfie_label: "Upload a selfie",
        submit: "Submit for Verification",
        success_title: "Verification Submitted",
        success_subtitle: "Our team is reviewing your documents.",
        success_message: "You will be notified once your identity has been verified.",
        back_to_account: "Back to Account",
        failed_title: "Verification Failed",
        failed_subtitle: "Please review your documents and try again.",
        failed_message: "Make sure your photos are clear and all information is visible.",
        retry: "Retry Verification"
      },
      payouts: {
        title: "Payouts",
        subtitle: "Manage how you receive your delivery earnings.",
        current_method: "Current Payout Method",
        no_method: "No payout method added",
        add_edit_title: "Add or Edit Payout Method",
        card: "Debit Card",
        card_name: "Name on card",
        card_number: "Card number",
        exp_placeholder: "MM/YY",
        cvv_placeholder: "CVC",
        bank: "Bank Account",
        bank_name_placeholder: "Account holder name",
        routing_placeholder: "Routing number",
        account_placeholder: "Account number",
        confirm_account_placeholder: "Re-enter account number",
        save: "Save Payout Method"
      },
      support: {
        title: "Support",
        subtitle: "Get help with your deliveries, payments, or account.",
        categories: "Support Categories",
        delivery: "Delivery Issues",
        payments: "Payment & Payouts",
        account: "Account & Identity",
        other: "Other Questions",
        open_ticket: "Open Support Ticket",
        ticket_title: "New Support Ticket",
        subject_placeholder: "Subject",
        message_placeholder: "Describe your issue...",
        submit_ticket: "Submit Ticket"
      },
      panel: {
        title: "Create Delivery",
        subtitle: "Describe your shipment and we’ll match you with trusted travelers.",
        status: "Draft · Not yet published"
      },
      form: {
        pickup: { label: "Pickup location", placeholder: "Enter pickup address" },
        dropoff: { label: "Dropoff location", placeholder: "Enter dropoff address" },
        delivery_type: "Delivery type",
        declared_value: "Declared value",
        sender_details: "Sender details",
        receiver_details: "Receiver details",
        package_details: "Package details",
        package_type: "Package type",
        item_description: "Item description",
        insurance: "Insurance",
        notes: "Notes for traveler"
      },
      sender_details_block: {
        name: "Name",
        phone: "Phone",
        email: "Email"
      },
      receiver_details_block: {
        name: "Name",
        phone: "Phone",
        email: "Email",
        address: "Address",
        instructions: "Delivery instructions"
      },
      size: {
        label: "Size",
        small: "Small",
        medium: "Medium",
        large: "Large"
      },
      payment: {
        method: "Payment method",
        credit: "Credit",
        debit: "Debit",
        wallet: "Wallet",
        card_name: "Name on card",
        card_number: "Card number",
        exp_cvc: "Expiry · CVC",
        card_name_placeholder: "John Doe",
        card_number_placeholder: "1234-5678-9012-3456",
        exp_placeholder: "MM/YY",
        cvv_placeholder: "CVC"
      },
      photo: {
        label: "Photo (optional)",
        add: "Add a reference photo",
        upload: "Upload"
      },
      estimate: {
        label: "Estimated cost",
        based_on: "Based on distance, urgency, and size"
      },
      route_preview: "Route preview",
      route_preview_subtitle: "Pickup, dropoff, and traveler position in real time.",
      traveler_matches: "Traveler matches",
      traveler_matches_subtitle: "Ranked by trust, proximity, and price.",
      no_matches: "No matches yet — waiting for travelers…",
      generate_matches: "Generate traveler matches",
      protection_notice: "Protected by Flexago escrow and verified travelers.",
      track: {
        title: "Delivery tracking",
        subtitle: "Real‑time updates from your traveler."
      },
      chat: {
        title: "Chat",
        header: "Support Chat",
        close: "Close",
        placeholder: "Type a message...",
        send: "Send",
        intro: "Hi! Tell us about your delivery and we’ll help you choose the best traveler.",
        autoReply: "Thanks! A support agent will review your delivery details shortly."
      },
      workspace: {
        title: "Sender workspace",
        subtitle: "Describe your shipment and get matched with trusted travelers.",
        draft: "Draft · Not yet published",
        estimateLabel: "Estimated price"
      }
    },

    traveler: {
      nav: {
        title: "Flexago Traveler",
        subtitle: "Logistics marketplace for travelers",
        env: "SANDBOX",
        version: "v1.0.0",
        searchPlaceholder: "Search jobs, routes, earnings..."
      },
      sidebar: {
        section: "Traveler Workspace",
        dashboard: "Traveler Dashboard",
        jobs: "Jobs / Requests",
        payments: "Payouts",
        verification: "Verification",
        support: "Support",
        profile: "Account & Identity",
        footer: "Connected to the Flexago logistics network."
      },
      panel: {
        title: "Flexago Traveler",
        subtitle: "Set your route, availability, and see matching delivery jobs.",
        status: "Verification · Unverified"
      },
      profile: {
        title: "Account & Identity",
        subtitle: "Manage your identity, verification, and account details.",
        status_unverified: "Unverified",
        status_pending: "Pending Verification",
        status_verified: "Verified",
        identity_header: "Identity Information",
        first_name: "First Name",
        last_name: "Last Name",
        dob: "Date of Birth",
        ssn: "Social Security Number",
        ssn_note: "Your SSN is encrypted and only used for identity verification.",
        verification_header: "Government ID Verification",
        id_front: "Upload ID (Front)",
        id_back: "Upload ID (Back)",
        selfie: "Selfie for Verification",
        contact_header: "Contact Information",
        phone: "Phone Number",
        email: "Email Address",
        address_header: "Home Address",
        account_header: "Account Information",
        payout_method: "Preferred Payout Method",
        created: "Account Created",
        updated: "Last Updated",
        save: "Save Changes"
      },
      availability: {
        header: "Availability",
        available: "Available",
        unavailable: "Unavailable",
        airport_mode: "Airport mode",
        long_distance: "Long‑distance mode"
      },
      route: {
        header: "Your route",
        start_placeholder: "Enter Start Address",
        end_placeholder: "Enter Destination Address"
      },
      jobs: {
        title: "Jobs & requests",
        subtitle: "Available deliveries based on your route, plus accepted and completed jobs.",
        available: "Available",
        accepted: "Accepted",
        completed: "Completed",
        empty_available: "No matching jobs yet — adjust your route or refresh.",
        empty_accepted: "You haven’t accepted any jobs yet.",
        empty_completed: "Completed jobs will appear here."
      },
      vehicle: {
        header: "Vehicle details",
        car: "Car",
        suv: "SUV",
        van: "Van",
        truck: "Truck",
        other: "Other",
        details_placeholder: "Plate, color, capacity (optional)"
      },
      payout: {
        header: "Earnings summary",
        today: "Today",
        week: "This week",
        pending: "Pending",
        method: "Payout method",
        debit: "Debit card",
        bank: "Bank account",
        card_name: "Name on card",
        card_number: "Card number",
        exp_cvc: "Expiry · CVC",
        card_name_placeholder: "John Doe",
        card_number_placeholder: "1234‑5678‑9012‑3456",
        exp_placeholder: "MM/YY",
        cvv_placeholder: "CVC",
        bank_name: "Account holder name",
        bank_name_placeholder: "Full name",
        routing_number: "Routing number",
        routing_placeholder: "123456789",
        account_number: "Account number",
        account_placeholder: "000123456789",
        confirm_account: "Confirm account number",
        confirm_account_placeholder: "Re-enter account number"
      },
      route_preview: "Route preview",
      route_preview_subtitle: "Start, end, and traveler position in real time.",
      refresh_jobs: "Refresh available jobs",
      protection_notice: "Only verified travelers can accept jobs. Routes and payouts are estimated.",
      chat: {
        title: "Chat",
        header: "Support Chat",
        close: "Close",
        placeholder: "Type a message...",
        send: "Send",
        intro: "Hi! Tell us about your travel route and we’ll help you find the best jobs.",
        autoReply: "Thanks! A support agent will review your route shortly."
         }
  }
}  // closes en
,   // comma BEFORE Spanish

 /* ============================================================
     SPANISH
     ============================================================ */
 es: {
  sender: {
    nav: {
      title: "Flexago Envíos",
      subtitle: "Plataforma logística para remitentes",
      env: "SANDBOX",
      version: "v1.0.0",
      searchPlaceholder: "Buscar envíos, viajeros, rutas..."
    },
    sidebar: {
      section: "Espacio del Remitente",
      account: "Cuenta e Identidad",
      create: "Crear envío",
      track: "Rastrear envío",
      payouts: "Pagos",
      verification: "Verificación",
      support: "Soporte",
      footer: "Conectado a la red logística de Flexago."
    },
    account: {
      title: "Cuenta e Identidad",
      subtitle: "Administra tu información personal y tus datos de identidad.",
      change_photo: "Cambiar foto",
      deliveries: "envíos",
      joined: "Registrado",
      verified_title: "Información verificada",
      verified: "✔ Verificado",
      phone: "Número de teléfono",
      email: "Correo electrónico",
      identity: "Verificación de identidad",
      personal_title: "Información personal",
      first_name: "Nombre",
      last_name: "Apellido",
      save: "Guardar cambios"
    },
    verification: {
      title: "Verificación",
      subtitle: "Verifica tu identidad para acceder a todas las funciones de Flexago.",
      status_unverified: "No verificado",
      id_front_title: "Subir identificación (Frontal)",
      id_front_label: "Sube la parte frontal de tu identificación",
      id_back_title: "Subir identificación (Reverso)",
      id_back_label: "Sube la parte trasera de tu identificación",
      selfie_title: "Selfie para verificación",
      selfie_label: "Sube un selfie",
      submit: "Enviar para verificación",
      success_title: "Verificación enviada",
      success_subtitle: "Nuestro equipo está revisando tus documentos.",
      success_message: "Serás notificado cuando tu identidad sea verificada.",
      back_to_account: "Volver a la cuenta",
      failed_title: "Verificación fallida",
      failed_subtitle: "Revisa tus documentos e inténtalo nuevamente.",
      failed_message: "Asegúrate de que las fotos sean claras y legibles.",
      retry: "Reintentar"
    },
    payouts: {
      title: "Pagos",
      subtitle: "Administra cómo recibes tus ganancias de envío.",
      current_method: "Método de pago actual",
      no_method: "No se ha agregado ningún método de pago",
      add_edit_title: "Agregar o editar método de pago",
      card: "Tarjeta de débito",
      card_name: "Nombre en la tarjeta",
      card_number: "Número de tarjeta",
      exp_placeholder: "MM/AA",
      cvv_placeholder: "CVC",
      bank: "Cuenta bancaria",
      bank_name_placeholder: "Nombre del titular",
      routing_placeholder: "Número de ruta",
      account_placeholder: "Número de cuenta",
      confirm_account_placeholder: "Reingresa el número de cuenta",
      save: "Guardar método de pago"
    },
    support: {
      title: "Soporte",
      subtitle: "Obtén ayuda con tus envíos, pagos o cuenta.",
      categories: "Categorías de soporte",
      delivery: "Problemas de envío",
      payments: "Pagos y transferencias",
      account: "Cuenta e identidad",
      other: "Otras preguntas",
      open_ticket: "Abrir ticket de soporte",
      ticket_title: "Nuevo ticket de soporte",
      subject_placeholder: "Asunto",
      message_placeholder: "Describe tu problema...",
      submit_ticket: "Enviar ticket"
    },
    panel: {
      title: "Crear envío",
      subtitle: "Describe tu paquete y te conectaremos con viajeros confiables.",
      status: "Borrador · No publicado"
    },
    form: {
      pickup: { label: "Lugar de recogida", placeholder: "Ingresa la dirección de recogida" },
      dropoff: { label: "Lugar de entrega", placeholder: "Ingresa la dirección de entrega" },
      delivery_type: "Tipo de envío",
      declared_value: "Valor declarado",
      sender_details: "Datos del remitente",
      receiver_details: "Datos del destinatario",
      package_details: "Detalles del paquete",
      package_type: "Tipo de paquete",
      item_description: "Descripción del artículo",
      insurance: "Seguro",
      notes: "Notas para el viajero"
    },
    sender_details_block: {
      name: "Nombre",
      phone: "Teléfono",
      email: "Correo electrónico"
    },
    receiver_details_block: {
      name: "Nombre",
      phone: "Teléfono",
      email: "Correo electrónico",
      address: "Dirección",
      instructions: "Instrucciones de entrega"
    },
    size: {
      label: "Tamaño",
      small: "Pequeño",
      medium: "Mediano",
      large: "Grande"
    },
    payment: {
      method: "Método de pago",
      credit: "Crédito",
      debit: "Débito",
      wallet: "Billetera",
      card_name: "Nombre en la tarjeta",
      card_number: "Número de tarjeta",
      exp_cvc: "Expiración · CVC",
      card_name_placeholder: "Juan Pérez",
      card_number_placeholder: "1234‑5678‑9012‑3456",
      exp_placeholder: "MM/AA",
      cvv_placeholder: "CVC"
    },
    photo: {
      label: "Foto (opcional)",
      add: "Agregar foto de referencia",
      upload: "Subir"
    },
    estimate: {
      label: "Costo estimado",
      based_on: "Basado en distancia, urgencia y tamaño"
    },
    route_preview: "Vista previa de ruta",
    route_preview_subtitle: "Recogida, entrega y posición del viajero en tiempo real.",
    traveler_matches: "Viajeros coincidentes",
    traveler_matches_subtitle: "Clasificados por confianza, proximidad y precio.",
    no_matches: "Aún no hay coincidencias — esperando viajeros…",
    generate_matches: "Generar coincidencias",
    protection_notice: "Protegido por el fideicomiso de Flexago y viajeros verificados.",
    track: {
      title: "Seguimiento del envío",
      subtitle: "Actualizaciones en tiempo real de tu viajero."
    },
    chat: {
      title: "Chat",
      header: "Chat de soporte",
      close: "Cerrar",
      placeholder: "Escribe un mensaje...",
      send: "Enviar",
      intro: "¡Hola! Cuéntanos sobre tu envío y te ayudaremos a elegir el mejor viajero.",
      autoReply: "¡Gracias! Un agente revisará tus detalles en breve."
    },
    workspace: {
      title: "Espacio del remitente",
      subtitle: "Describe tu envío y encuentra viajeros confiables.",
      draft: "Borrador · No publicado",
      estimateLabel: "Precio estimado"
    }
  },

  traveler: {
    nav: {
      title: "Flexago Viajero",
      subtitle: "Plataforma logística para viajeros",
      env: "SANDBOX",
      version: "v1.0.0",
      searchPlaceholder: "Buscar trabajos, rutas, ganancias..."
    },
    sidebar: {
      section: "Espacio del Viajero",
      dashboard: "Panel",
      jobs: "Trabajos / Solicitudes",
      payments: "Pagos",
      verification: "Verificación",
      support: "Soporte",
      profile: "Cuenta e Identidad",
      footer: "Conectado a la red logística de Flexago."
    },
    panel: {
      title: "Flexago Viajero",
      subtitle: "Configura tu ruta, disponibilidad y ve los trabajos disponibles.",
      status: "Verificación · No verificado"
    },
    profile: {
      title: "Cuenta e Identidad",
      subtitle: "Administra tu identidad, verificación e información personal.",
      status_unverified: "No verificado",
      status_pending: "Pendiente de verificación",
      status_verified: "Verificado",
      identity_header: "Información de identidad",
      first_name: "Nombre",
      last_name: "Apellido",
      dob: "Fecha de nacimiento",
      ssn: "Número de seguro social",
      ssn_note: "Tu SSN está encriptado y solo se usa para verificación.",
      verification_header: "Verificación de identidad",
      id_front: "Subir ID (Frontal)",
      id_back: "Subir ID (Reverso)",
      selfie: "Selfie para verificación",
      contact_header: "Información de contacto",
      phone: "Número de teléfono",
      email: "Correo electrónico",
      address_header: "Dirección de residencia",
      account_header: "Información de la cuenta",
      payout_method: "Método de pago preferido",
      created: "Cuenta creada",
      updated: "Última actualización",
      save: "Guardar cambios"
    },
    availability: {
      header: "Disponibilidad",
      available: "Disponible",
      unavailable: "No disponible",
      airport_mode: "Modo aeropuerto",
      long_distance: "Larga distancia"
    },
    route: {
      header: "Tu ruta",
      start_placeholder: "Ingresa la dirección de inicio",
      end_placeholder: "Ingresa la dirección de destino"
    },
    jobs: {
      title: "Trabajos y solicitudes",
      subtitle: "Envíos disponibles según tu ruta, además de trabajos aceptados y completados.",
      available: "Disponibles",
      accepted: "Aceptados",
      completed: "Completados",
      empty_available: "No hay trabajos coincidentes — ajusta tu ruta o actualiza.",
      empty_accepted: "Aún no has aceptado ningún trabajo.",
      empty_completed: "Los trabajos completados aparecerán aquí."
    },
    vehicle: {
      header: "Detalles del vehículo",
      car: "Auto",
      suv: "SUV",
      van: "Furgoneta",
      truck: "Camión",
      other: "Otro",
      details_placeholder: "Placa, color, capacidad (opcional)"
    },
    payout: {
      header: "Resumen de ganancias",
      today: "Hoy",
      week: "Esta semana",
      pending: "Pendiente",
      method: "Método de pago",
      debit: "Tarjeta de débito",
      bank: "Cuenta bancaria",
      card_name: "Nombre en la tarjeta",
      card_number: "Número de tarjeta",
      exp_cvc: "Expiración · CVC",
      card_name_placeholder: "Juan Pérez",
      card_number_placeholder: "1234‑5678‑9012‑3456",
      exp_placeholder: "MM/AA",
      cvv_placeholder: "CVC",
      bank_name: "Nombre del titular",
      bank_name_placeholder: "Nombre completo",
      routing_number: "Número de ruta",
      routing_placeholder: "123456789",
      account_number: "Número de cuenta",
      account_placeholder: "000123456789",
      confirm_account: "Confirmar número",
      confirm_account_placeholder: "Reingresa el número"
    },
    route_preview: "Vista previa de ruta",
    route_preview_subtitle: "Inicio, destino y posición del viajero en tiempo real.",
    refresh_jobs: "Actualizar trabajos",
    protection_notice: "Solo los viajeros verificados pueden aceptar trabajos.",
    chat: {
      title: "Chat",
      header: "Chat de soporte",
      close: "Cerrar",
      placeholder: "Escribe un mensaje...",
      send: "Enviar",
      intro: "¡Hola! Cuéntanos sobre tu ruta y te ayudaremos a encontrar los mejores trabajos.",
      autoReply: "¡Gracias! Un agente revisará tu ruta en breve."
    }
  }
},

/* ============================================================
     FRENCH
     ============================================================ */
fr: {
  sender: {
    nav: {
      title: "Flexago Livraison",
      subtitle: "Place de marché logistique pour expéditeurs",
      env: "SANDBOX",
      version: "v1.0.0",
      searchPlaceholder: "Rechercher des livraisons, voyageurs, itinéraires..."
    },
    sidebar: {
      section: "Espace Expéditeur",
      account: "Compte & Identité",
      create: "Créer une livraison",
      track: "Suivre une livraison",
      payouts: "Paiements",
      verification: "Vérification",
      support: "Support",
      footer: "Connecté au réseau logistique Flexago."
    },
    account: {
      title: "Compte & Identité",
      subtitle: "Gérez vos informations personnelles et vos détails d'identité.",
      change_photo: "Changer la photo",
      deliveries: "livraisons",
      joined: "Inscription",
      verified_title: "Informations vérifiées",
      verified: "✔ Vérifié",
      phone: "Numéro de téléphone",
      email: "Email",
      identity: "Vérification d'identité",
      personal_title: "Informations personnelles",
      first_name: "Prénom",
      last_name: "Nom",
      save: "Enregistrer les modifications"
    },
    verification: {
      title: "Vérification",
      subtitle: "Vérifiez votre identité pour accéder à toutes les fonctionnalités Flexago.",
      status_unverified: "Non vérifié",
      id_front_title: "Téléverser la pièce d'identité (recto)",
      id_front_label: "Téléverser le recto de votre pièce d'identité",
      id_back_title: "Téléverser la pièce d'identité (verso)",
      id_back_label: "Téléverser le verso de votre pièce d'identité",
      selfie_title: "Selfie pour vérification",
      selfie_label: "Téléverser un selfie",
      submit: "Soumettre pour vérification",
      success_title: "Vérification envoyée",
      success_subtitle: "Notre équipe examine vos documents.",
      success_message: "Vous serez notifié une fois votre identité vérifiée.",
      back_to_account: "Retour au compte",
      failed_title: "Échec de la vérification",
      failed_subtitle: "Veuillez vérifier vos documents et réessayer.",
      failed_message: "Assurez-vous que vos photos sont claires et lisibles.",
      retry: "Réessayer"
    },
    payouts: {
      title: "Paiements",
      subtitle: "Gérez la manière dont vous recevez vos gains de livraison.",
      current_method: "Méthode de paiement actuelle",
      no_method: "Aucune méthode ajoutée",
      add_edit_title: "Ajouter ou modifier une méthode de paiement",
      card: "Carte bancaire",
      card_name: "Nom sur la carte",
      card_number: "Numéro de carte",
      exp_placeholder: "MM/AA",
      cvv_placeholder: "CVC",
      bank: "Compte bancaire",
      bank_name_placeholder: "Nom du titulaire",
      routing_placeholder: "Numéro de routage",
      account_placeholder: "Numéro de compte",
      confirm_account_placeholder: "Confirmer le numéro de compte",
      save: "Enregistrer la méthode"
    },
    support: {
      title: "Support",
      subtitle: "Obtenez de l'aide pour vos livraisons, paiements ou compte.",
      categories: "Catégories d'assistance",
      delivery: "Problèmes de livraison",
      payments: "Paiements & virements",
      account: "Compte & identité",
      other: "Autres questions",
      open_ticket: "Ouvrir un ticket",
      ticket_title: "Nouveau ticket d'assistance",
      subject_placeholder: "Sujet",
      message_placeholder: "Décrivez votre problème...",
      submit_ticket: "Envoyer le ticket"
    },
    panel: {
      title: "Créer une livraison",
      subtitle: "Décrivez votre envoi et nous vous mettrons en relation avec des voyageurs fiables.",
      status: "Brouillon · Non publié"
    },
    form: {
      pickup: { label: "Lieu de collecte", placeholder: "Saisir l'adresse de collecte" },
      dropoff: { label: "Lieu de dépôt", placeholder: "Saisir l'adresse de dépôt" },
      delivery_type: "Type de livraison",
      declared_value: "Valeur déclarée",
      sender_details: "Informations expéditeur",
      receiver_details: "Informations destinataire",
      package_details: "Détails du colis",
      package_type: "Type de colis",
      item_description: "Description de l'article",
      insurance: "Assurance",
      notes: "Notes pour le voyageur"
    },
    sender_details_block: {
      name: "Nom",
      phone: "Téléphone",
      email: "Email"
    },
    receiver_details_block: {
      name: "Nom",
      phone: "Téléphone",
      email: "Email",
      address: "Adresse",
      instructions: "Instructions de livraison"
    },
    size: {
      label: "Taille",
      small: "Petit",
      medium: "Moyen",
      large: "Grand"
    },
    payment: {
      method: "Méthode de paiement",
      credit: "Crédit",
      debit: "Débit",
      wallet: "Portefeuille",
      card_name: "Nom sur la carte",
      card_number: "Numéro de carte",
      exp_cvc: "Expiration · CVC",
      card_name_placeholder: "Jean Dupont",
      card_number_placeholder: "1234‑5678‑9012‑3456",
      exp_placeholder: "MM/AA",
      cvv_placeholder: "CVC"
    },
    photo: {
      label: "Photo (optionnel)",
      add: "Ajouter une photo de référence",
      upload: "Téléverser"
    },
    estimate: {
      label: "Coût estimé",
      based_on: "Basé sur la distance, l'urgence et la taille"
    },
    route_preview: "Aperçu de l'itinéraire",
    route_preview_subtitle: "Collecte, dépôt et position du voyageur en temps réel.",
    traveler_matches: "Voyageurs correspondants",
    traveler_matches_subtitle: "Classés par confiance, proximité et prix.",
    no_matches: "Aucune correspondance pour le moment — en attente de voyageurs…",
    generate_matches: "Générer des correspondances",
    protection_notice: "Protégé par l'entiercement Flexago et des voyageurs vérifiés.",
    track: {
      title: "Suivi de livraison",
      subtitle: "Mises à jour en temps réel de votre voyageur."
    },
    chat: {
      title: "Chat",
      header: "Chat d'assistance",
      close: "Fermer",
      placeholder: "Écrire un message...",
      send: "Envoyer",
      intro: "Bonjour ! Parlez-nous de votre livraison et nous vous aiderons à choisir le meilleur voyageur.",
      autoReply: "Merci ! Un agent examinera vos informations sous peu."
    },
    workspace: {
      title: "Espace expéditeur",
      subtitle: "Décrivez votre envoi et trouvez des voyageurs fiables.",
      draft: "Brouillon · Non publié",
      estimateLabel: "Prix estimé"
    }
  },

  traveler: {
    nav: {
      title: "Flexago Voyageur",
      subtitle: "Place de marché logistique pour voyageurs",
      env: "SANDBOX",
      version: "v1.0.0",
      searchPlaceholder: "Rechercher des jobs, itinéraires, gains..."
    },
    sidebar: {
      section: "Espace Voyageur",
      dashboard: "Tableau de bord",
      jobs: "Jobs / Demandes",
      payments: "Paiements",
      verification: "Vérification",
      support: "Support",
      profile: "Compte & Identité",
      footer: "Connecté au réseau logistique Flexago."
    },
    panel: {
      title: "Flexago Voyageur",
      subtitle: "Définissez votre itinéraire, disponibilité et voyez les jobs correspondants.",
      status: "Vérification · Non vérifié"
    },
    profile: {
      title: "Compte & Identité",
      subtitle: "Gérez votre identité, vérification et informations personnelles.",
      status_unverified: "Non vérifié",
      status_pending: "En attente de vérification",
      status_verified: "Vérifié",
      identity_header: "Informations d'identité",
      first_name: "Prénom",
      last_name: "Nom",
      dob: "Date de naissance",
      ssn: "Numéro de sécurité sociale",
      ssn_note: "Votre SSN est chiffré et utilisé uniquement pour la vérification.",
      verification_header: "Vérification d'identité",
      id_front: "Téléverser ID (recto)",
      id_back: "Téléverser ID (verso)",
      selfie: "Selfie pour vérification",
      contact_header: "Informations de contact",
      phone: "Numéro de téléphone",
      email: "Adresse email",
      address_header: "Adresse personnelle",
      account_header: "Informations du compte",
      payout_method: "Méthode de paiement préférée",
      created: "Compte créé",
      updated: "Dernière mise à jour",
      save: "Enregistrer"
    },
    availability: {
      header: "Disponibilité",
      available: "Disponible",
      unavailable: "Indisponible",
      airport_mode: "Mode aéroport",
      long_distance: "Longue distance"
    },
    route: {
      header: "Votre itinéraire",
      start_placeholder: "Saisir l'adresse de départ",
      end_placeholder: "Saisir l'adresse d'arrivée"
    },
    jobs: {
      title: "Jobs & demandes",
      subtitle: "Livraisons disponibles selon votre itinéraire, plus vos jobs acceptés et terminés.",
      available: "Disponibles",
      accepted: "Acceptés",
      completed: "Terminés",
      empty_available: "Aucun job correspondant — ajustez votre itinéraire ou actualisez.",
      empty_accepted: "Vous n'avez encore accepté aucun job.",
      empty_completed: "Les jobs terminés apparaîtront ici."
    },
    vehicle: {
      header: "Détails du véhicule",
      car: "Voiture",
      suv: "SUV",
      van: "Fourgonnette",
      truck: "Camion",
      other: "Autre",
      details_placeholder: "Plaque, couleur, capacité (optionnel)"
    },
    payout: {
      header: "Résumé des gains",
      today: "Aujourd'hui",
      week: "Cette semaine",
      pending: "En attente",
      method: "Méthode de paiement",
      debit: "Carte de débit",
      bank: "Compte bancaire",
      card_name: "Nom sur la carte",
      card_number: "Numéro de carte",
      exp_cvc: "Expiration · CVC",
      card_name_placeholder: "Jean Dupont",
      card_number_placeholder: "1234‑5678‑9012‑3456",
      exp_placeholder: "MM/AA",
      cvv_placeholder: "CVC",
      bank_name: "Nom du titulaire",
      bank_name_placeholder: "Nom complet",
      routing_number: "Numéro de routage",
      routing_placeholder: "123456789",
      account_number: "Numéro de compte",
      account_placeholder: "000123456789",
      confirm_account: "Confirmer le numéro",
      confirm_account_placeholder: "Saisir à nouveau le numéro"
    },
    route_preview: "Aperçu de l'itinéraire",
    route_preview_subtitle: "Départ, arrivée et position du voyageur en temps réel.",
    refresh_jobs: "Actualiser les jobs",
    protection_notice: "Seuls les voyageurs vérifiés peuvent accepter des jobs.",
    chat: {
      title: "Chat",
      header: "Chat d'assistance",
      close: "Fermer",
      placeholder: "Écrire un message...",
      send: "Envoyer",
      intro: "Bonjour ! Parlez-nous de votre itinéraire et nous vous aiderons à trouver les meilleurs jobs.",
      autoReply: "Merci ! Un agent examinera votre itinéraire sous peu."
    }
  }
},

  /* ============================================================
     HAITIAN CREOLE
     ============================================================ */
 ht: {
  sender: {
    nav: {
      title: "Flexago Livrezon",
      subtitle: "Platfòm lojistik pou moun k ap voye pakè",
      env: "SANDBOX",
      version: "v1.0.0",
      searchPlaceholder: "Chèche livrezon, vwayajè, wout..."
    },
    sidebar: {
      section: "Espas Moun k ap Voye",
      account: "Kont & Idantite",
      create: "Kreye livrezon",
      track: "Swiv livrezon",
      payouts: "Peman",
      verification: "Verifikasyon",
      support: "Sipò",
      footer: "Konekte ak rezo lojistik Flexago."
    },
    account: {
      title: "Kont & Idantite",
      subtitle: "Jere enfòmasyon pèsonèl ou ak detay idantite ou.",
      change_photo: "Chanje foto",
      deliveries: "livrezon",
      joined: "Antre depi",
      verified_title: "Enfòmasyon verifye",
      verified: "✔ Verifye",
      phone: "Nimewo telefòn",
      email: "Imèl",
      identity: "Tcheke idantite",
      personal_title: "Enfòmasyon pèsonèl",
      first_name: "Non",
      last_name: "Siyati",
      save: "Sove chanjman yo"
    },
    verification: {
      title: "Verifikasyon",
      subtitle: "Verifye idantite ou pou jwenn tout fonksyon Flexago yo.",
      status_unverified: "Pa verifye",
      id_front_title: "Telechaje ID (Devant)",
      id_front_label: "Telechaje bò devan kat idantite ou",
      id_back_title: "Telechaje ID (Dèyè)",
      id_back_label: "Telechaje bò dèyè kat idantite ou",
      selfie_title: "Selfi pou verifikasyon",
      selfie_label: "Telechaje yon selfi",
      submit: "Soumèt pou verifikasyon",
      success_title: "Verifikasyon soumèt",
      success_subtitle: "Ekip nou an ap revize dokiman ou yo.",
      success_message: "W ap resevwa yon notifikasyon lè idantite ou verifye.",
      back_to_account: "Retounen nan kont",
      failed_title: "Verifikasyon echwe",
      failed_subtitle: "Tanpri revize dokiman ou yo epi eseye ankò.",
      failed_message: "Asire foto yo klè epi tout enfòmasyon vizib.",
      retry: "Reeseye"
    },
    payouts: {
      title: "Peman",
      subtitle: "Jere fason ou resevwa lajan livrezon yo.",
      current_method: "Metòd peman aktyèl",
      no_method: "Pa gen metòd peman ajoute",
      add_edit_title: "Ajoute oswa modifye metòd peman",
      card: "Kat debi",
      card_name: "Non sou kat la",
      card_number: "Nimewo kat la",
      exp_placeholder: "MM/AA",
      cvv_placeholder: "CVC",
      bank: "Kont labank",
      bank_name_placeholder: "Non pwopriyetè kont la",
      routing_placeholder: "Nimewo wout la",
      account_placeholder: "Nimewo kont la",
      confirm_account_placeholder: "Re-antre nimewo kont la",
      save: "Sove metòd peman"
    },
    support: {
      title: "Sipò",
      subtitle: "Jwenn èd pou livrezon, peman oswa kont ou.",
      categories: "Kategori sipò",
      delivery: "Pwoblèm livrezon",
      payments: "Peman & transfè",
      account: "Kont & idantite",
      other: "Lòt kesyon",
      open_ticket: "Louvri yon tikè sipò",
      ticket_title: "Nouvo tikè sipò",
      subject_placeholder: "Sijè",
      message_placeholder: "Dekri pwoblèm ou...",
      submit_ticket: "Voye tikè a"
    },
    panel: {
      title: "Kreye livrezon",
      subtitle: "Dekri pakè ou epi n ap jwenn vwayajè serye pou ou.",
      status: "Brouyon · Pa pibliye"
    },
    form: {
      pickup: { label: "Kote pou ranmase", placeholder: "Antre adrès ranmasaj la" },
      dropoff: { label: "Kote pou depoze", placeholder: "Antre adrès depo a" },
      delivery_type: "Kalite livrezon",
      declared_value: "Valè deklare",
      sender_details: "Enfòmasyon moun k ap voye a",
      receiver_details: "Enfòmasyon moun k ap resevwa a",
      package_details: "Detay pakè a",
      package_type: "Kalite pakè",
      item_description: "Deskripsyon atik la",
      insurance: "Asirans",
      notes: "Nòt pou vwayajè a"
    },
    sender_details_block: {
      name: "Non",
      phone: "Telefòn",
      email: "Imèl"
    },
    receiver_details_block: {
      name: "Non",
      phone: "Telefòn",
      email: "Imèl",
      address: "Adrès",
      instructions: "Enstriksyon livrezon"
    },
    size: {
      label: "Gwosè",
      small: "Ti",
      medium: "Mwayen",
      large: "Gwo"
    },
    payment: {
      method: "Metòd peman",
      credit: "Kredi",
      debit: "Debi",
      wallet: "Bous",
      card_name: "Non sou kat la",
      card_number: "Nimewo kat la",
      exp_cvc: "Ekspirasyon · CVC",
      card_name_placeholder: "Jean Pierre",
      card_number_placeholder: "1234‑5678‑9012‑3456",
      exp_placeholder: "MM/AA",
      cvv_placeholder: "CVC"
    },
    photo: {
      label: "Foto (opsyonèl)",
      add: "Ajoute yon foto referans",
      upload: "Telechaje"
    },
    estimate: {
      label: "Kout estime",
      based_on: "Baze sou distans, ijans ak gwosè"
    },
    route_preview: "Aperçu wout la",
    route_preview_subtitle: "Ranmase, depoze ak pozisyon vwayajè a an tan reyèl.",
    traveler_matches: "Vwayajè ki koresponn",
    traveler_matches_subtitle: "Klasman selon konfyans, pwoksimite ak pri.",
    no_matches: "Pa gen korespondans ankò — annatandan vwayajè yo…",
    generate_matches: "Jenere korespondans",
    protection_notice: "Pwoteje pa escrow Flexago ak vwayajè verifye.",
    track: {
      title: "Swiv livrezon",
      subtitle: "Mizajou an tan reyèl nan men vwayajè a."
    },
    chat: {
      title: "Chat",
      header: "Chat sipò",
      close: "Fèmen",
      placeholder: "Tape yon mesaj...",
      send: "Voye",
      intro: "Bonjou! Rakonte nou sou livrezon ou epi n ap ede w jwenn pi bon vwayajè a.",
      autoReply: "Mèsi! Yon ajan ap revize detay ou yo byento."
    },
    workspace: {
      title: "Espas moun k ap voye",
      subtitle: "Dekri pakè ou epi jwenn vwayajè serye.",
      draft: "Brouyon · Pa pibliye",
      estimateLabel: "Pri estime"
    }
  },

  traveler: {
    nav: {
      title: "Flexago Vwayajè",
      subtitle: "Platfòm lojistik pou vwayajè",
      env: "SANDBOX",
      version: "v1.0.0",
      searchPlaceholder: "Chèche travay, wout, revni..."
    },
    sidebar: {
      section: "Espas Vwayajè",
      dashboard: "Tablo de bord",
      jobs: "Travay / Demann",
      payments: "Peman",
      verification: "Verifikasyon",
      support: "Sipò",
      profile: "Kont & Idantite",
      footer: "Konekte ak rezo lojistik Flexago."
    },
    panel: {
      title: "Flexago Vwayajè",
      subtitle: "Mete wout ou, disponiblite ou, epi wè travay ki koresponn.",
      status: "Verifikasyon · Pa verifye"
    },
    profile: {
      title: "Kont & Idantite",
      subtitle: "Jere idantite ou, verifikasyon ak enfòmasyon pèsonèl.",
      status_unverified: "Pa verifye",
      status_pending: "An atant verifikasyon",
      status_verified: "Verifye",
      identity_header: "Enfòmasyon idantite",
      first_name: "Non",
      last_name: "Siyati",
      dob: "Dat nesans",
      ssn: "Nimewo sekirite sosyal",
      ssn_note: "SSN ou an ankripte epi itilize sèlman pou verifikasyon.",
      verification_header: "Verifikasyon idantite",
      id_front: "Telechaje ID (Devant)",
      id_back: "Telechaje ID (Dèyè)",
      selfie: "Selfi pou verifikasyon",
      contact_header: "Enfòmasyon kontak",
      phone: "Nimewo telefòn",
      email: "Adrès imèl",
      address_header: "Adrès kay",
      account_header: "Enfòmasyon kont",
      payout_method: "Metòd peman prefere",
      created: "Kont kreye",
      updated: "Dènye mizajou",
      save: "Sove chanjman yo"
    },
    availability: {
      header: "Disponiblite",
      available: "Disponib",
      unavailable: "Pa disponib",
      airport_mode: "Mòd ayewopò",
      long_distance: "Long distans"
    },
    route: {
      header: "Wout ou",
      start_placeholder: "Antre adrès depa",
      end_placeholder: "Antre adrès destinasyon"
    },
    jobs: {
      title: "Travay & demann",
      subtitle: "Livrezon ki disponib selon wout ou, plis travay ou aksepte ak fini.",
      available: "Disponib",
      accepted: "Aksepte",
      completed: "Fini",
      empty_available: "Pa gen travay ki koresponn — ajiste wout ou oswa rafrechi.",
      empty_accepted: "Ou poko aksepte okenn travay.",
      empty_completed: "Travay fini yo ap parèt isit la."
    },
    vehicle: {
      header: "Detay machin",
      car: "Machin",
      suv: "SUV",
      van: "Vann",
      truck: "Kamyon",
      other: "Lòt",
      details_placeholder: "Plak, koulè, kapasite (opsyonèl)"
    },
    payout: {
      header: "Rezime revni",
      today: "Jodi a",
      week: "Semèn sa a",
      pending: "An atant",
      method: "Metòd peman",
      debit: "Kat debi",
      bank: "Kont labank",
      card_name: "Non sou kat la",
      card_number: "Nimewo kat la",
      exp_cvc: "Ekspirasyon · CVC",
      card_name_placeholder: "Jean Pierre",
      card_number_placeholder: "1234‑5678‑9012‑3456",
      exp_placeholder: "MM/AA",
      cvv_placeholder: "CVC",
      bank_name: "Non pwopriyetè kont la",
      bank_name_placeholder: "Non konplè",
      routing_number: "Nimewo wout la",
      routing_placeholder: "123456789",
      account_number: "Nimewo kont la",
      account_placeholder: "000123456789",
      confirm_account: "Konfime nimewo a",
      confirm_account_placeholder: "Re-antre nimewo a"
    },
    route_preview: "Aperçu wout la",
    route_preview_subtitle: "Depa, arive ak pozisyon vwayajè a an tan reyèl.",
    refresh_jobs: "Rafrechi travay yo",
    protection_notice: "Sèlman vwayajè verifye ka aksepte travay.",
    chat: {
      title: "Chat",
      header: "Chat sipò",
      close: "Fèmen",
      placeholder: "Tape yon mesaj...",
      send: "Voye",
      intro: "Bonjou! Rakonte nou sou wout ou epi n ap ede w jwenn pi bon travay yo.",
      autoReply: "Mèsi! Yon ajan ap revize wout ou byento."
    }
  }
},
   /* ============================================================
     CHINESE (SIMPLIFIED)
     ============================================================ */
zh: {
  sender: {
    nav: {
      title: "Flexago 递送",
      subtitle: "为寄件人提供的物流平台",
      env: "SANDBOX",
      version: "v1.0.0",
      searchPlaceholder: "搜索递送、旅客、路线..."
    },
    sidebar: {
      section: "寄件人工作区",
      account: "账户与身份",
      create: "创建递送",
      track: "追踪递送",
      payouts: "付款",
      verification: "身份验证",
      support: "支持",
      footer: "已连接至 Flexago 物流网络。"
    },
    account: {
      title: "账户与身份",
      subtitle: "管理您的个人信息和身份详情。",
      change_photo: "更换照片",
      deliveries: "递送",
      joined: "加入时间",
      verified_title: "已验证信息",
      verified: "✔ 已验证",
      phone: "电话号码",
      email: "电子邮箱",
      identity: "身份检查",
      personal_title: "个人信息",
      first_name: "名字",
      last_name: "姓氏",
      save: "保存更改"
    },
    verification: {
      title: "身份验证",
      subtitle: "验证您的身份以使用 Flexago 的全部功能。",
      status_unverified: "未验证",
      id_front_title: "上传身份证（正面）",
      id_front_label: "上传身份证正面照片",
      id_back_title: "上传身份证（背面）",
      id_back_label: "上传身份证背面照片",
      selfie_title: "自拍验证",
      selfie_label: "上传自拍照",
      submit: "提交验证",
      success_title: "验证已提交",
      success_subtitle: "我们的团队正在审核您的文件。",
      success_message: "身份验证完成后您将收到通知。",
      back_to_account: "返回账户",
      failed_title: "验证失败",
      failed_subtitle: "请检查您的文件并重试。",
      failed_message: "请确保照片清晰且信息可见。",
      retry: "重试"
    },
    payouts: {
      title: "付款",
      subtitle: "管理您如何接收递送收入。",
      current_method: "当前付款方式",
      no_method: "尚未添加付款方式",
      add_edit_title: "添加或编辑付款方式",
      card: "借记卡",
      card_name: "持卡人姓名",
      card_number: "卡号",
      exp_placeholder: "MM/YY",
      cvv_placeholder: "CVC",
      bank: "银行账户",
      bank_name_placeholder: "账户持有人姓名",
      routing_placeholder: "路由号码",
      account_placeholder: "账户号码",
      confirm_account_placeholder: "再次输入账户号码",
      save: "保存付款方式"
    },
    support: {
      title: "支持",
      subtitle: "获取有关递送、付款或账户的帮助。",
      categories: "支持类别",
      delivery: "递送问题",
      payments: "付款与转账",
      account: "账户与身份",
      other: "其他问题",
      open_ticket: "提交支持工单",
      ticket_title: "新建支持工单",
      subject_placeholder: "主题",
      message_placeholder: "描述您的问题...",
      submit_ticket: "提交工单"
    },
    panel: {
      title: "创建递送",
      subtitle: "描述您的包裹，我们将为您匹配可信赖的旅客。",
      status: "草稿 · 尚未发布"
    },
    form: {
      pickup: { label: "取件地点", placeholder: "输入取件地址" },
      dropoff: { label: "送达地点", placeholder: "输入送达地址" },
      delivery_type: "递送类型",
      declared_value: "申报价值",
      sender_details: "寄件人信息",
      receiver_details: "收件人信息",
      package_details: "包裹详情",
      package_type: "包裹类型",
      item_description: "物品描述",
      insurance: "保险",
      notes: "给旅客的备注"
    },
    sender_details_block: {
      name: "姓名",
      phone: "电话",
      email: "电子邮箱"
    },
    receiver_details_block: {
      name: "姓名",
      phone: "电话",
      email: "电子邮箱",
      address: "地址",
      instructions: "递送说明"
    },
    size: {
      label: "尺寸",
      small: "小",
      medium: "中",
      large: "大"
    },
    payment: {
      method: "付款方式",
      credit: "信用卡",
      debit: "借记卡",
      wallet: "钱包",
      card_name: "持卡人姓名",
      card_number: "卡号",
      exp_cvc: "有效期 · CVC",
      card_name_placeholder: "张伟",
      card_number_placeholder: "1234‑5678‑9012‑3456",
      exp_placeholder: "MM/YY",
      cvv_placeholder: "CVC"
    },
    photo: {
      label: "照片（可选）",
      add: "添加参考照片",
      upload: "上传"
    },
    estimate: {
      label: "预计费用",
      based_on: "基于距离、紧急程度和尺寸"
    },
    route_preview: "路线预览",
    route_preview_subtitle: "实时显示取件、送达和旅客位置。",
    traveler_matches: "旅客匹配",
    traveler_matches_subtitle: "按可信度、距离和价格排序。",
    no_matches: "暂无匹配 — 正在等待旅客…",
    generate_matches: "生成匹配",
    protection_notice: "由 Flexago 托管与认证旅客保障。",
    track: {
      title: "递送追踪",
      subtitle: "来自旅客的实时更新。"
    },
    chat: {
      title: "聊天",
      header: "支持聊天",
      close: "关闭",
      placeholder: "输入消息...",
      send: "发送",
      intro: "您好！告诉我们您的递送需求，我们会帮您找到最佳旅客。",
      autoReply: "谢谢！客服人员将尽快查看您的信息。"
    },
    workspace: {
      title: "寄件人工作区",
      subtitle: "描述您的包裹并匹配可信赖的旅客。",
      draft: "草稿 · 尚未发布",
      estimateLabel: "预计价格"
    }
  },

  traveler: {
    nav: {
      title: "Flexago 旅客",
      subtitle: "为旅客提供的物流平台",
      env: "SANDBOX",
      version: "v1.0.0",
      searchPlaceholder: "搜索工作、路线、收入..."
    },
    sidebar: {
      section: "旅客工作区",
      dashboard: "仪表盘",
      jobs: "工作 / 请求",
      payments: "付款",
      verification: "验证",
      support: "支持",
      profile: "账户与身份",
      footer: "已连接至 Flexago 物流网络。"
    },
    panel: {
      title: "Flexago 旅客",
      subtitle: "设置您的路线、可用时间并查看匹配的递送任务。",
      status: "验证 · 未验证"
    },
    profile: {
      title: "账户与身份",
      subtitle: "管理您的身份、验证和账户信息。",
      status_unverified: "未验证",
      status_pending: "待验证",
      status_verified: "已验证",
      identity_header: "身份信息",
      first_name: "名字",
      last_name: "姓氏",
      dob: "出生日期",
      ssn: "社会安全号码",
      ssn_note: "您的 SSN 已加密，仅用于身份验证。",
      verification_header: "身份证验证",
      id_front: "上传身份证（正面）",
      id_back: "上传身份证（背面）",
      selfie: "自拍验证",
      contact_header: "联系方式",
      phone: "电话号码",
      email: "电子邮箱",
      address_header: "家庭住址",
      account_header: "账户信息",
      payout_method: "首选付款方式",
      created: "账户创建时间",
      updated: "最后更新",
      save: "保存更改"
    },
    availability: {
      header: "可用性",
      available: "可用",
      unavailable: "不可用",
      airport_mode: "机场模式",
      long_distance: "长途模式"
    },
    route: {
      header: "您的路线",
      start_placeholder: "输入起始地址",
      end_placeholder: "输入目的地址"
    },
    jobs: {
      title: "工作与请求",
      subtitle: "基于您的路线显示可用递送任务，以及已接受和已完成的任务。",
      available: "可用",
      accepted: "已接受",
      completed: "已完成",
      empty_available: "暂无匹配任务 — 请调整路线或刷新。",
      empty_accepted: "您尚未接受任何任务。",
      empty_completed: "已完成的任务将显示在此处。"
    },
    vehicle: {
      header: "车辆信息",
      car: "轿车",
      suv: "SUV",
      van: "面包车",
      truck: "卡车",
      other: "其他",
      details_placeholder: "车牌、颜色、载重（可选）"
    },
    payout: {
      header: "收入概览",
      today: "今日",
      week: "本周",
      pending: "待处理",
      method: "付款方式",
      debit: "借记卡",
      bank: "银行账户",
      card_name: "持卡人姓名",
      card_number: "卡号",
      exp_cvc: "有效期 · CVC",
      card_name_placeholder: "张伟",
      card_number_placeholder: "1234‑5678‑9012‑3456",
      exp_placeholder: "MM/YY",
      cvv_placeholder: "CVC",
      bank_name: "账户持有人姓名",
      bank_name_placeholder: "全名",
      routing_number: "路由号码",
      routing_placeholder: "123456789",
      account_number: "账户号码",
      account_placeholder: "000123456789",
      confirm_account: "确认账户号码",
      confirm_account_placeholder: "再次输入号码"
    },
    route_preview: "路线预览",
    route_preview_subtitle: "起点、终点及旅客位置的实时显示。",
    refresh_jobs: "刷新任务",
    protection_notice: "只有已验证的旅客可以接受任务。",
    chat: {
      title: "聊天",
      header: "支持聊天",
      close: "关闭",
      placeholder: "输入消息...",
      send: "发送",
      intro: "您好！告诉我们您的路线，我们将帮助您找到最佳任务。",
      autoReply: "谢谢！客服人员将尽快查看您的路线。"
    }
  }
}, // closes zh
/* ============================================================
   PORTUGUESE (BRAZIL)
   ============================================================ */
pt: {
  sender: {
    nav: {
      title: "Flexago Entregas",
      subtitle: "Marketplace logístico para remetentes",
      env: "SANDBOX",
      version: "v1.0.0",
      searchPlaceholder: "Buscar entregas, viajantes, rotas..."
    },
    sidebar: {
      section: "Área do Remetente",
      account: "Conta e Identidade",
      create: "Criar Entrega",
      track: "Rastrear Entrega",
      payouts: "Pagamentos",
      verification: "Verificação",
      support: "Suporte",
      footer: "Conectado à rede logística Flexago."
    },
    account: {
      title: "Conta e Identidade",
      subtitle: "Gerencie suas informações pessoais e dados de identidade.",
      change_photo: "Alterar Foto",
      deliveries: "entregas",
      joined: "Cadastrado",
      verified_title: "Informações Verificadas",
      verified: "✔ Verificado",
      phone: "Número de Telefone",
      email: "E-mail",
      identity: "Verificação de Identidade",
      personal_title: "Informações Pessoais",
      first_name: "Nome",
      last_name: "Sobrenome",
      save: "Salvar Alterações"
    },
    verification: {
      title: "Verificação",
      subtitle: "Verifique sua identidade para acessar todos os recursos da Flexago.",
      status_unverified: "Não verificado",
      id_front_title: "Enviar Documento (Frente)",
      id_front_label: "Envie a parte frontal do seu documento",
      id_back_title: "Enviar Documento (Verso)",
      id_back_label: "Envie a parte traseira do seu documento",
      selfie_title: "Selfie para Verificação",
      selfie_label: "Envie uma selfie",
      submit: "Enviar para Verificação",
      success_title: "Verificação Enviada",
      success_subtitle: "Nossa equipe está analisando seus documentos.",
      success_message: "Você será notificado quando sua identidade for verificada.",
      back_to_account: "Voltar para a Conta",
      failed_title: "Falha na Verificação",
      failed_subtitle: "Revise seus documentos e tente novamente.",
      failed_message: "Certifique-se de que as fotos estejam claras e legíveis.",
      retry: "Tentar Novamente"
    },
    payouts: {
      title: "Pagamentos",
      subtitle: "Gerencie como você recebe seus ganhos de entrega.",
      current_method: "Método de Pagamento Atual",
      no_method: "Nenhum método de pagamento adicionado",
      add_edit_title: "Adicionar ou Editar Método de Pagamento",
      card: "Cartão de Débito",
      card_name: "Nome no cartão",
      card_number: "Número do cartão",
      exp_placeholder: "MM/AA",
      cvv_placeholder: "CVC",
      bank: "Conta Bancária",
      bank_name_placeholder: "Nome do titular",
      routing_placeholder: "Número de roteamento",
      account_placeholder: "Número da conta",
      confirm_account_placeholder: "Reinsira o número da conta",
      save: "Salvar Método de Pagamento"
    },
    support: {
      title: "Suporte",
      subtitle: "Obtenha ajuda com suas entregas, pagamentos ou conta.",
      categories: "Categorias de Suporte",
      delivery: "Problemas de Entrega",
      payments: "Pagamentos e Transferências",
      account: "Conta e Identidade",
      other: "Outras Perguntas",
      open_ticket: "Abrir Chamado",
      ticket_title: "Novo Chamado de Suporte",
      subject_placeholder: "Assunto",
      message_placeholder: "Descreva seu problema...",
      submit_ticket: "Enviar Chamado"
    },
    panel: {
      title: "Criar Entrega",
      subtitle: "Descreva seu envio e encontraremos viajantes confiáveis para você.",
      status: "Rascunho · Não publicado"
    },
    form: {
      pickup: { label: "Local de retirada", placeholder: "Digite o endereço de retirada" },
      dropoff: { label: "Local de entrega", placeholder: "Digite o endereço de entrega" },
      delivery_type: "Tipo de entrega",
      declared_value: "Valor declarado",
      sender_details: "Dados do remetente",
      receiver_details: "Dados do destinatário",
      package_details: "Detalhes do pacote",
      package_type: "Tipo de pacote",
      item_description: "Descrição do item",
      insurance: "Seguro",
      notes: "Observações para o viajante"
    },
    sender_details_block: {
      name: "Nome",
      phone: "Telefone",
      email: "E-mail"
    },
    receiver_details_block: {
      name: "Nome",
      phone: "Telefone",
      email: "E-mail",
      address: "Endereço",
      instructions: "Instruções de entrega"
    },
    size: {
      label: "Tamanho",
      small: "Pequeno",
      medium: "Médio",
      large: "Grande"
    },
    payment: {
      method: "Método de pagamento",
      credit: "Crédito",
      debit: "Débito",
      wallet: "Carteira",
      card_name: "Nome no cartão",
      card_number: "Número do cartão",
      exp_cvc: "Validade · CVC",
      card_name_placeholder: "João Silva",
      card_number_placeholder: "1234‑5678‑9012‑3456",
      exp_placeholder: "MM/AA",
      cvv_placeholder: "CVC"
    },
    photo: {
      label: "Foto (opcional)",
      add: "Adicionar foto de referência",
      upload: "Enviar"
    },
    estimate: {
      label: "Custo estimado",
      based_on: "Baseado em distância, urgência e tamanho"
    },
    route_preview: "Prévia da rota",
    route_preview_subtitle: "Retirada, entrega e posição do viajante em tempo real.",
    traveler_matches: "Viajantes compatíveis",
    traveler_matches_subtitle: "Classificados por confiança, proximidade e preço.",
    no_matches: "Nenhuma correspondência ainda — aguardando viajantes…",
    generate_matches: "Gerar correspondências",
    protection_notice: "Protegido pelo escrow Flexago e viajantes verificados.",
    track: {
      title: "Rastreamento da entrega",
      subtitle: "Atualizações em tempo real do seu viajante."
    },
    chat: {
      title: "Chat",
      header: "Chat de Suporte",
      close: "Fechar",
      placeholder: "Digite uma mensagem...",
      send: "Enviar",
      intro: "Olá! Conte-nos sobre sua entrega e ajudaremos você a escolher o melhor viajante.",
      autoReply: "Obrigado! Um agente analisará seus detalhes em breve."
    },
    workspace: {
      title: "Área do remetente",
      subtitle: "Descreva seu envio e encontre viajantes confiáveis.",
      draft: "Rascunho · Não publicado",
      estimateLabel: "Preço estimado"
    }
  },

  traveler: {
    nav: {
      title: "Flexago Viajante",
      subtitle: "Marketplace logístico para viajantes",
      env: "SANDBOX",
      version: "v1.0.0",
      searchPlaceholder: "Buscar trabalhos, rotas, ganhos..."
    },
    sidebar: {
      section: "Área do Viajante",
      dashboard: "Painel",
      jobs: "Trabalhos / Solicitações",
      payments: "Pagamentos",
      verification: "Verificação",
      support: "Suporte",
      profile: "Conta e Identidade",
      footer: "Conectado à rede logística Flexago."
    },
    panel: {
      title: "Flexago Viajante",
      subtitle: "Defina sua rota, disponibilidade e veja trabalhos compatíveis.",
      status: "Verificação · Não verificado"
    },
    profile: {
      title: "Conta e Identidade",
      subtitle: "Gerencie sua identidade, verificação e informações pessoais.",
      status_unverified: "Não verificado",
      status_pending: "Pendente de verificação",
      status_verified: "Verificado",
      identity_header: "Informações de identidade",
      first_name: "Nome",
      last_name: "Sobrenome",
      dob: "Data de nascimento",
      ssn: "Número de seguridade social",
      ssn_note: "Seu SSN é criptografado e usado apenas para verificação.",
      verification_header: "Verificação de identidade",
      id_front: "Enviar documento (Frente)",
      id_back: "Enviar documento (Verso)",
      selfie: "Selfie para verificação",
      contact_header: "Informações de contato",
      phone: "Número de telefone",
      email: "E-mail",
      address_header: "Endereço residencial",
      account_header: "Informações da conta",
      payout_method: "Método de pagamento preferido",
      created: "Conta criada",
      updated: "Última atualização",
      save: "Salvar alterações"
    },
    availability: {
      header: "Disponibilidade",
      available: "Disponível",
      unavailable: "Indisponível",
      airport_mode: "Modo aeroporto",
      long_distance: "Longa distância"
    },
    route: {
      header: "Sua rota",
      start_placeholder: "Digite o endereço de partida",
      end_placeholder: "Digite o endereço de destino"
    },
    jobs: {
      title: "Trabalhos e solicitações",
      subtitle: "Entregas disponíveis com base na sua rota, além de trabalhos aceitos e concluídos.",
      available: "Disponíveis",
      accepted: "Aceitos",
      completed: "Concluídos",
      empty_available: "Nenhum trabalho correspondente — ajuste sua rota ou atualize.",
      empty_accepted: "Você ainda não aceitou nenhum trabalho.",
      empty_completed: "Os trabalhos concluídos aparecerão aqui."
    },
    vehicle: {
      header: "Detalhes do veículo",
      car: "Carro",
      suv: "SUV",
      van: "Van",
      truck: "Caminhão",
      other: "Outro",
      details_placeholder: "Placa, cor, capacidade (opcional)"
    },
    payout: {
      header: "Resumo de ganhos",
      today: "Hoje",
      week: "Esta semana",
      pending: "Pendente",
      method: "Método de pagamento",
      debit: "Cartão de débito",
      bank: "Conta bancária",
      card_name: "Nome no cartão",
      card_number: "Número do cartão",
      exp_cvc: "Validade · CVC",
      card_name_placeholder: "João Silva",
      card_number_placeholder: "1234‑5678‑9012‑3456",
      exp_placeholder: "MM/AA",
      cvv_placeholder: "CVC",
      bank_name: "Nome do titular",
      bank_name_placeholder: "Nome completo",
      routing_number: "Número de roteamento",
      routing_placeholder: "123456789",
      account_number: "Número da conta",
      account_placeholder: "000123456789",
      confirm_account: "Confirmar número",
      confirm_account_placeholder: "Reinsira o número"
    },
    route_preview: "Prévia da rota",
    route_preview_subtitle: "Partida, destino e posição do viajante em tempo real.",
    refresh_jobs: "Atualizar trabalhos",
    protection_notice: "Somente viajantes verificados podem aceitar trabalhos.",
    chat: {
      title: "Chat",
      header: "Chat de Suporte",
      close: "Fechar",
      placeholder: "Digite uma mensagem...",
      send: "Enviar",
      intro: "Olá! Conte-nos sobre sua rota e ajudaremos você a encontrar os melhores trabalhos.",
      autoReply: "Obrigado! Um agente revisará sua rota em breve."
    }
  }
}  // closes pt
}; // closes translations


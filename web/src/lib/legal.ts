export type LegalDoc = {
  slug: string;
  title: string;
  description: string;
  body: string[];
};

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "terminos",
    title: "Términos y Condiciones",
    description:
      "Términos de uso de MercadoRD: cuentas, publicaciones, compras y responsabilidades.",
    body: [
      "Al usar MercadoRD aceptas estos términos. MercadoRD es una plataforma que conecta a compradores y vendedores en la República Dominicana; no es parte de las transacciones entre usuarios salvo en lo relativo a los servicios que ofrece la plataforma.",
      "Cuentas. Debes proporcionar información veraz al registrarte y mantener la confidencialidad de tus credenciales. Eres responsable de la actividad que ocurra en tu cuenta.",
      "Publicaciones. Los vendedores son responsables de la exactitud, legalidad y disponibilidad de los productos que publican. No se permiten artículos ilegales, falsificados o que infrinjan derechos de terceros.",
      "Compras. Los precios se muestran en pesos dominicanos (RD$). Las condiciones de pago, envío y devolución dependen de cada vendedor y de las funciones disponibles en la plataforma.",
      "Uso aceptable. No se permite el fraude, el spam, la suplantación de identidad ni el uso de la plataforma para fines ilícitos. MercadoRD puede suspender cuentas que incumplan estas reglas.",
      "Cambios. Podemos actualizar estos términos; los cambios relevantes se comunicarán en la plataforma.",
    ],
  },
  {
    slug: "privacidad",
    title: "Política de Privacidad",
    description:
      "Cómo MercadoRD recopila, usa y protege tus datos personales, conforme a la Ley 172-13.",
    body: [
      "En MercadoRD tratamos tus datos personales conforme a la Ley 172-13 de la República Dominicana sobre protección de datos de carácter personal.",
      "Datos que recopilamos. Datos de cuenta (nombre, correo), datos de publicaciones y actividad en la plataforma, y datos técnicos necesarios para el funcionamiento del servicio.",
      "Uso. Usamos tus datos para operar la plataforma, procesar registros y publicaciones, prevenir fraude y mejorar el servicio. No vendemos tus datos personales.",
      "Tus derechos. Puedes acceder, rectificar y eliminar tus datos. La eliminación de cuenta borra tu información asociada según lo permitido por la ley.",
      "Seguridad. Aplicamos controles de acceso a nivel de base de datos y buenas prácticas de seguridad para proteger tu información.",
      "Contacto. Para ejercer tus derechos o consultas de privacidad, contáctanos a través de los canales de la plataforma.",
    ],
  },
  {
    slug: "sobre-nosotros",
    title: "Sobre MercadoRD",
    description:
      "MercadoRD es el marketplace nacional de República Dominicana para comprar, vender y subastar.",
    body: [
      "MercadoRD es una plataforma dominicana para comprar, vender y subastar productos de forma segura, con verificación de identidad y foco en la confianza entre usuarios.",
      "Nuestra misión es facilitar el comercio local en toda la República Dominicana, dando a vendedores independientes y tiendas las herramientas para llegar a más compradores.",
      "Este sitio está en evolución continua: nuevas funciones de pago, envíos y reputación se irán habilitando de forma progresiva.",
    ],
  },
];

export function legalBySlug(slug: string): LegalDoc | undefined {
  return LEGAL_DOCS.find((d) => d.slug === slug);
}

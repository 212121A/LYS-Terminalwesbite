export interface MenuItem {
  id: string;
  number: string;
  name: string;
  description?: string;
  price: number;
  spicy?: boolean;
  sizeOptions?: { label: string; price: number }[];
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

export const menuData: MenuCategory[] = [
  {
    id: "vorspeisen",
    name: "Vorspeisen",
    items: [
      {
        id: "v1",
        number: "V1",
        name: "Nem Ran",
        description: "Drei knusprig gebackene Frühlingsrollen gefüllt mit Hackfleisch, Gemüse & Vietn. Kräutern",
        price: 4.00,
      },
      {
        id: "v3",
        number: "03",
        name: "Thai-Suppe",
        price: 3.50,
      },
      {
        id: "v4",
        number: "04",
        name: "Veget. Minifrühlingsrollen",
        price: 2.00,
      },
    ],
  },
  {
    id: "reis-gebraten",
    name: "Reis gebraten",
    items: [
      { id: "r6", number: "06", name: "Mit Ei & Gemüse", price: 7.00 },
      { id: "r7", number: "07", name: "Mit Ei, Hühnerfleisch & Gemüse", price: 8.50 },
      { id: "r8", number: "08", name: "Mit Ei, Pan. Hühnerfleisch & Gemüse", price: 10.50 },
      { id: "r9", number: "09", name: "Mit Ei, Gebr. Entenfleisch & Gemüse", price: 11.50 },
      { id: "r10", number: "10", name: "Mit Gemüse", price: 7.00 },
      { id: "r11", number: "11", name: "Mit Hühnerfleisch & Gemüse", price: 8.50 },
      { id: "r12", number: "12", name: "Mit Pan. Hühnerfleisch & Gemüse", price: 10.50 },
      { id: "r13", number: "13", name: "Mit Gebr. Entenfleisch & Gemüse", price: 11.50 },
    ],
  },
  {
    id: "huehnerfleisch-nudeln",
    name: "Gebratenes Hühnerfleisch mit Nudeln/Reis",
    items: [
      { id: "h14", number: "14", name: "Mit versch. Gemüse und Sojasoße", price: 9.00 },
      { id: "h15", number: "15", name: "Mit Süßsauersoße, Ananas & Gemüse", price: 9.00 },
      { id: "h16", number: "16", name: "Mit Erdnusssoße und Gemüse", description: "Leicht scharf", price: 9.00, spicy: true },
    ],
  },
  {
    id: "huehnerfleisch-paniert",
    name: "Hühnerfleisch paniert",
    items: [
      { id: "p14", number: "14P", name: "Mit versch. Gemüse und Sojasoße", price: 10.50 },
      { id: "p15", number: "15P", name: "Mit Süßsauersoße, Ananas & Gemüse", price: 10.50 },
      { id: "p16", number: "16P", name: "Mit Erdnusssoße und Gemüse", description: "Leicht scharf", price: 10.50, spicy: true },
    ],
  },
  {
    id: "entenfleisch",
    name: "Entenfleisch (gebraten) mit Nudeln/Reis",
    items: [
      { id: "e19", number: "19", name: "Mit versch. Gemüse und Sojasoße", price: 11.50 },
      { id: "e20", number: "20", name: "Mit Süßsauersoße, Ananas & Gemüse", price: 11.50 },
      { id: "e21", number: "21", name: "Mit Erdnusssoße und Gemüse", description: "Leicht scharf", price: 11.50, spicy: true },
    ],
  },
  {
    id: "thaicurry",
    name: "Thailändische Gerichte mit Nudeln/Reis in Thaicurry & Kokosmilch",
    items: [
      { id: "t1", number: "T1", name: "Hühnerfleisch mit Gemüse", description: "Leicht scharf", price: 9.00, spicy: true },
      { id: "t2", number: "T2", name: "Pan. Hühnerfleisch mit Gemüse", description: "Leicht scharf", price: 10.50, spicy: true },
      { id: "t4", number: "T4", name: "Gebr. Ente", description: "Leicht scharf", price: 11.50, spicy: true },
      { id: "t5", number: "T5", name: "Garnelen mit Gemüse", description: "Leicht scharf", price: 11.50, spicy: true },
      { id: "t6", number: "T6", name: "Tofu mit Gemüse", description: "Leicht scharf", price: 8.50, spicy: true },
    ],
  },
  {
    id: "nudel-reisboxen",
    name: "Nudel- & Reisboxen",
    items: [
      {
        id: "nb1",
        number: "NB1",
        name: "Mit Gemüse",
        description: "Inkl. Soße nach Wahl: Sojasoße, Süßsauersoße oder Thaicurry mit Kokosmilch",
        price: 5.00,
        sizeOptions: [
          { label: "Klein", price: 4.00 },
          { label: "Groß", price: 5.00 },
        ],
      },
      {
        id: "nb2",
        number: "NB2",
        name: "Mit Hühnerfleisch und Gemüse",
        description: "Inkl. Soße nach Wahl: Sojasoße, Süßsauersoße oder Thaicurry mit Kokosmilch",
        price: 6.00,
        sizeOptions: [
          { label: "Klein", price: 4.50 },
          { label: "Groß", price: 6.00 },
        ],
      },
      {
        id: "nb3",
        number: "NB3",
        name: "Mit Pan. Hühnerfleisch und Gemüse",
        description: "Inkl. Soße nach Wahl",
        price: 6.00,
      },
      {
        id: "nb4",
        number: "NB4",
        name: "Mit Pan. Fisch und Gemüse",
        description: "Inkl. Soße nach Wahl",
        price: 6.00,
      },
      {
        id: "nb5",
        number: "NB5",
        name: "Mit 4 Veg. Frühlingsrollen und Gemüse",
        description: "Inkl. Soße nach Wahl",
        price: 6.00,
      },
    ],
  },
];

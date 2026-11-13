/*
 * Tempo Card for Home Assistant
 * https://github.com/juju35/ha-tempo-card
 *
 * Lovelace cards for the EDF Tempo electricity tariff: color of today and tomorrow, days left per color in the
 * season, current off-peak / peak period with its countdown, and the estimated cost of the day and of the month
 * from the meter indexes and a price grid.
 * Data comes from the integrations already in place: RTE Tempo (https://github.com/hekmon/rtetempo), Tarif EDF
 * (https://github.com/delphiki/hass-tarif-edf), EDF Tempo (https://github.com/chrisbansart/ha_tempo), Linky TIC
 * (https://github.com/hekmon/linkytic) and the ZLinky_TIC through Zigbee2MQTT, found through the entity registry, or
 * any entity given in the options.
 */

const VERSION = "__VERSION__";

const COLORS = ["blue", "white", "red"];
const PERIODS = ["hc", "hp"];
// Index keys: color then period, in the order of the Linky Tempo registers (EASF01-06, BBRHCJB … BBRHPJR).
const INDEX_KEYS = COLORS.flatMap((c) => PERIODS.map((p) => `${c}_${p}`));
// EDF regulated Tempo prices incl. VAT, €/kWh, in force from 1 August 2026: the default price grid.
const DEFAULT_PRICES = { blue_hc: 0.1356, blue_hp: 0.1654, white_hc: 0.1536, white_hp: 0.1921, red_hc: 0.1615, red_hp: 0.7295 };
// Days of each color in a season (1 September to 31 August): the rest of the season is blue.
const SEASON_TOTALS = { white: 43, red: 22 };
const DEFAULT_OFFPEAK = "22:00-06:00";
// A Tempo day runs from 06:00 to 06:00 the next day.
const DAY_START_MIN = 6 * 60;
const DEFAULT_TZ = "Europe/Paris";
const STATS_TTL = 5 * 60000;
const SECTIONS = ["period", "season", "cost"];

const ICONS = {
  bolt: "M11 15H6L13 1V9H18L11 23V15Z",
  sun: "M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z",
  night: "M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.92 20.37,16.71 19.92,17.4C19.65,17.83 19.37,18.24 19.03,18.65C16.17,22.12 11.07,22.59 7.6,19.73C4.13,16.87 3.66,11.77 6.5,8.3C6.85,7.88 7.23,7.5 7.63,7.16C8.25,6.6 9.18,7 9.25,7.82C9.36,10.06 10.36,12.21 12.23,13.75C14.12,15.3 16.5,15.97 18.97,15.95Z",
  calendar: "M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z",
  euro: "M15,18.5C12.49,18.5 10.32,17.08 9.24,15H15L16,13H8.58C8.53,12.67 8.5,12.34 8.5,12C8.5,11.66 8.53,11.33 8.58,11H15L16,9H9.24C10.32,6.92 12.5,5.5 15,5.5C16.61,5.5 18.09,6.09 19.23,7.07L21,5.3C19.41,3.87 17.3,3 15,3C11.08,3 7.76,5.51 6.52,9H3L2,11H6.06C6.02,11.33 6,11.66 6,12C6,12.34 6.02,12.67 6.06,13H3L2,15H6.52C7.76,18.49 11.08,21 15,21C17.31,21 19.41,20.13 21,18.7L19.22,16.93C18.09,17.91 16.62,18.5 15,18.5Z",
  chevron_down: "M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z",
  expand: "M10,21V19H6.41L10.91,14.5L9.5,13.09L5,17.59V14H3V21H10M14.5,10.91L19,6.41V10H21V3H14V5H17.59L13.09,9.5L14.5,10.91Z",
  collapse: "M19.5,3.09L15,7.59V4H13V11H20V9H16.41L20.91,4.5L19.5,3.09M4,13V15H7.59L3.09,19.5L4.5,20.91L9,16.41V20H11V13H4Z",
};

const STRINGS = {
  en: {
    card_title: "EDF Tempo",
    today: "Today",
    tomorrow: "Tomorrow",
    blue: "Blue",
    white: "White",
    red: "Red",
    blue_day: "Blue day",
    white_day: "White day",
    red_day: "Red day",
    unknown_day: "Not yet known",
    peak: "Peak hours",
    offpeak: "Off-peak hours",
    peak_short: "Peak",
    offpeak_short: "Off-peak",
    ends_in: "ends in {time}",
    then_period: "Then {period}",
    current_price: "Current price",
    season: "Season {season}",
    days_left: "{left} of {total} left",
    cost: "Estimated cost",
    this_month: "This month",
    subscription_incl: "incl. subscription",
    no_entity: "No Tempo entity found: set up a supported integration or set today_entity.",
    zoom_in: "Show details",
    zoom_out: "Show less",
    title: "Title",
    today_entity: "Today's color entity",
    tomorrow_entity: "Tomorrow's color entity",
    offpeak_entity: "Off-peak entity (binary sensor or tariff period)",
    offpeak_hours: "Off-peak hours (e.g. 22:00-06:00)",
    show_title: "Show title",
    show_subtitle: "Show subtitle",
    show_period: "Current period",
    show_season: "Season days left",
    show_cost: "Estimated cost",
    collapsed: "Folded sections",
    zoom: "Detail button",
    zoom_helper: "Switches the mini card to the full card's content and back",
    indexes: "Meter indexes",
    prices: "Price grid (per kWh)",
    subscription: "Monthly subscription",
    days_left_entities: "Days left entities",
    language: "Language",
    lang_auto: "Auto (Home Assistant)",
  },
  fr: {
    card_title: "EDF Tempo",
    today: "Aujourd'hui",
    tomorrow: "Demain",
    blue: "Bleu",
    white: "Blanc",
    red: "Rouge",
    blue_day: "Jour bleu",
    white_day: "Jour blanc",
    red_day: "Jour rouge",
    unknown_day: "Pas encore connu",
    peak: "Heures pleines",
    offpeak: "Heures creuses",
    peak_short: "HP",
    offpeak_short: "HC",
    ends_in: "fin dans {time}",
    then_period: "Puis {period}",
    current_price: "Prix actuel",
    season: "Saison {season}",
    days_left: "{left} sur {total} restants",
    cost: "Coût estimé",
    this_month: "Ce mois-ci",
    subscription_incl: "abonnement inclus",
    no_entity: "Aucune entité Tempo trouvée : configurez une intégration prise en charge ou renseignez today_entity.",
    zoom_in: "Afficher les détails",
    zoom_out: "Réduire",
    title: "Titre",
    today_entity: "Entité couleur du jour",
    tomorrow_entity: "Entité couleur de demain",
    offpeak_entity: "Entité heures creuses (capteur binaire ou période tarifaire)",
    offpeak_hours: "Heures creuses (ex. 22:00-06:00)",
    show_title: "Afficher le titre",
    show_subtitle: "Afficher le sous-titre",
    show_period: "Période en cours",
    show_season: "Jours restants de la saison",
    show_cost: "Coût estimé",
    collapsed: "Sections repliées",
    zoom: "Bouton détail",
    zoom_helper: "Bascule la mini-carte vers le contenu de la carte complète et inversement",
    indexes: "Index du compteur",
    prices: "Grille de prix (par kWh)",
    subscription: "Abonnement mensuel",
    days_left_entities: "Entités des jours restants",
    language: "Langue",
    lang_auto: "Auto (Home Assistant)",
  },
  de: {
    card_title: "EDF Tempo",
    today: "Heute",
    tomorrow: "Morgen",
    blue: "Blau",
    white: "Weiß",
    red: "Rot",
    blue_day: "Blauer Tag",
    white_day: "Weißer Tag",
    red_day: "Roter Tag",
    unknown_day: "Noch nicht bekannt",
    peak: "Hochtarif",
    offpeak: "Niedertarif",
    peak_short: "HT",
    offpeak_short: "NT",
    ends_in: "endet in {time}",
    then_period: "Danach {period}",
    current_price: "Aktueller Preis",
    season: "Saison {season}",
    days_left: "{left} von {total} übrig",
    cost: "Geschätzte Kosten",
    this_month: "Dieser Monat",
    subscription_incl: "inkl. Grundgebühr",
    no_entity: "Keine Tempo-Entität gefunden: Richte eine unterstützte Integration ein oder setze today_entity.",
    zoom_in: "Details anzeigen",
    zoom_out: "Weniger anzeigen",
    title: "Titel",
    today_entity: "Entität Farbe heute",
    tomorrow_entity: "Entität Farbe morgen",
    offpeak_entity: "Niedertarif-Entität (Binärsensor oder Tarifzeitraum)",
    offpeak_hours: "Niedertarifzeiten (z. B. 22:00-06:00)",
    show_title: "Titel anzeigen",
    show_subtitle: "Untertitel anzeigen",
    show_period: "Aktueller Zeitraum",
    show_season: "Verbleibende Tage der Saison",
    show_cost: "Geschätzte Kosten",
    collapsed: "Eingeklappte Abschnitte",
    zoom: "Detail-Schaltfläche",
    zoom_helper: "Schaltet die Mini-Karte auf den Inhalt der vollen Karte und zurück",
    indexes: "Zählerstände",
    prices: "Preistabelle (pro kWh)",
    subscription: "Monatliche Grundgebühr",
    days_left_entities: "Entitäten der verbleibenden Tage",
    language: "Sprache",
    lang_auto: "Automatisch (Home Assistant)",
  },
  es: {
    card_title: "EDF Tempo",
    today: "Hoy",
    tomorrow: "Mañana",
    blue: "Azul",
    white: "Blanco",
    red: "Rojo",
    blue_day: "Día azul",
    white_day: "Día blanco",
    red_day: "Día rojo",
    unknown_day: "Aún no se conoce",
    peak: "Horas punta",
    offpeak: "Horas valle",
    peak_short: "Punta",
    offpeak_short: "Valle",
    ends_in: "termina en {time}",
    then_period: "Después {period}",
    current_price: "Precio actual",
    season: "Temporada {season}",
    days_left: "Quedan {left} de {total}",
    cost: "Coste estimado",
    this_month: "Este mes",
    subscription_incl: "suscripción incluida",
    no_entity: "No se ha encontrado ninguna entidad Tempo: configura una integración compatible o indica today_entity.",
    zoom_in: "Mostrar detalles",
    zoom_out: "Mostrar menos",
    title: "Título",
    today_entity: "Entidad del color de hoy",
    tomorrow_entity: "Entidad del color de mañana",
    offpeak_entity: "Entidad de horas valle (sensor binario o periodo tarifario)",
    offpeak_hours: "Horas valle (p. ej. 22:00-06:00)",
    show_title: "Mostrar título",
    show_subtitle: "Mostrar subtítulo",
    show_period: "Periodo actual",
    show_season: "Días restantes de la temporada",
    show_cost: "Coste estimado",
    collapsed: "Secciones plegadas",
    zoom: "Botón de detalle",
    zoom_helper: "Cambia la minitarjeta al contenido de la tarjeta completa y viceversa",
    indexes: "Índices del contador",
    prices: "Tabla de precios (por kWh)",
    subscription: "Suscripción mensual",
    days_left_entities: "Entidades de días restantes",
    language: "Idioma",
    lang_auto: "Automático (Home Assistant)",
  },
  it: {
    card_title: "EDF Tempo",
    today: "Oggi",
    tomorrow: "Domani",
    blue: "Blu",
    white: "Bianco",
    red: "Rosso",
    blue_day: "Giorno blu",
    white_day: "Giorno bianco",
    red_day: "Giorno rosso",
    unknown_day: "Non ancora noto",
    peak: "Ore di punta",
    offpeak: "Ore fuori punta",
    peak_short: "Punta",
    offpeak_short: "Fuori punta",
    ends_in: "termina tra {time}",
    then_period: "Poi {period}",
    current_price: "Prezzo attuale",
    season: "Stagione {season}",
    days_left: "{left} su {total} rimanenti",
    cost: "Costo stimato",
    this_month: "Questo mese",
    subscription_incl: "abbonamento incluso",
    no_entity: "Nessuna entità Tempo trovata: configura un'integrazione supportata o imposta today_entity.",
    zoom_in: "Mostra dettagli",
    zoom_out: "Mostra meno",
    title: "Titolo",
    today_entity: "Entità colore di oggi",
    tomorrow_entity: "Entità colore di domani",
    offpeak_entity: "Entità ore fuori punta (sensore binario o fascia tariffaria)",
    offpeak_hours: "Ore fuori punta (es. 22:00-06:00)",
    show_title: "Mostra titolo",
    show_subtitle: "Mostra sottotitolo",
    show_period: "Fascia attuale",
    show_season: "Giorni rimanenti della stagione",
    show_cost: "Costo stimato",
    collapsed: "Sezioni chiuse",
    zoom: "Pulsante dettagli",
    zoom_helper: "Passa la mini scheda al contenuto della scheda completa e viceversa",
    indexes: "Letture del contatore",
    prices: "Tabella prezzi (per kWh)",
    subscription: "Abbonamento mensile",
    days_left_entities: "Entità dei giorni rimanenti",
    language: "Lingua",
    lang_auto: "Automatica (Home Assistant)",
  },
  nl: {
    card_title: "EDF Tempo",
    today: "Vandaag",
    tomorrow: "Morgen",
    blue: "Blauw",
    white: "Wit",
    red: "Rood",
    blue_day: "Blauwe dag",
    white_day: "Witte dag",
    red_day: "Rode dag",
    unknown_day: "Nog niet bekend",
    peak: "Piekuren",
    offpeak: "Daluren",
    peak_short: "Piek",
    offpeak_short: "Dal",
    ends_in: "eindigt over {time}",
    then_period: "Daarna {period}",
    current_price: "Huidige prijs",
    season: "Seizoen {season}",
    days_left: "{left} van {total} over",
    cost: "Geschatte kosten",
    this_month: "Deze maand",
    subscription_incl: "incl. vastrecht",
    no_entity: "Geen Tempo-entiteit gevonden: stel een ondersteunde integratie in of vul today_entity in.",
    zoom_in: "Details tonen",
    zoom_out: "Minder tonen",
    title: "Titel",
    today_entity: "Entiteit kleur van vandaag",
    tomorrow_entity: "Entiteit kleur van morgen",
    offpeak_entity: "Daluren-entiteit (binaire sensor of tariefperiode)",
    offpeak_hours: "Daluren (bijv. 22:00-06:00)",
    show_title: "Titel tonen",
    show_subtitle: "Ondertitel tonen",
    show_period: "Huidige periode",
    show_season: "Resterende dagen van het seizoen",
    show_cost: "Geschatte kosten",
    collapsed: "Ingeklapte secties",
    zoom: "Detailknop",
    zoom_helper: "Schakelt de minikaart naar de inhoud van de volledige kaart en terug",
    indexes: "Meterstanden",
    prices: "Prijstabel (per kWh)",
    subscription: "Maandelijks vastrecht",
    days_left_entities: "Entiteiten resterende dagen",
    language: "Taal",
    lang_auto: "Automatisch (Home Assistant)",
  },
  pt: {
    card_title: "EDF Tempo",
    today: "Hoje",
    tomorrow: "Amanhã",
    blue: "Azul",
    white: "Branco",
    red: "Vermelho",
    blue_day: "Dia azul",
    white_day: "Dia branco",
    red_day: "Dia vermelho",
    unknown_day: "Ainda não conhecido",
    peak: "Horas de ponta",
    offpeak: "Horas de vazio",
    peak_short: "Ponta",
    offpeak_short: "Vazio",
    ends_in: "termina dentro de {time}",
    then_period: "Depois {period}",
    current_price: "Preço atual",
    season: "Época {season}",
    days_left: "Faltam {left} de {total}",
    cost: "Custo estimado",
    this_month: "Este mês",
    subscription_incl: "assinatura incluída",
    no_entity: "Nenhuma entidade Tempo encontrada: configure uma integração suportada ou defina today_entity.",
    zoom_in: "Mostrar detalhes",
    zoom_out: "Mostrar menos",
    title: "Título",
    today_entity: "Entidade da cor de hoje",
    tomorrow_entity: "Entidade da cor de amanhã",
    offpeak_entity: "Entidade de horas de vazio (sensor binário ou período tarifário)",
    offpeak_hours: "Horas de vazio (p. ex. 22:00-06:00)",
    show_title: "Mostrar título",
    show_subtitle: "Mostrar subtítulo",
    show_period: "Período atual",
    show_season: "Dias restantes da época",
    show_cost: "Custo estimado",
    collapsed: "Secções recolhidas",
    zoom: "Botão de detalhe",
    zoom_helper: "Muda o mini cartão para o conteúdo do cartão completo e de volta",
    indexes: "Leituras do contador",
    prices: "Tabela de preços (por kWh)",
    subscription: "Assinatura mensal",
    days_left_entities: "Entidades dos dias restantes",
    language: "Idioma",
    lang_auto: "Automático (Home Assistant)",
  },
  pl: {
    card_title: "EDF Tempo",
    today: "Dziś",
    tomorrow: "Jutro",
    blue: "Niebieski",
    white: "Biały",
    red: "Czerwony",
    blue_day: "Dzień niebieski",
    white_day: "Dzień biały",
    red_day: "Dzień czerwony",
    unknown_day: "Jeszcze nieznany",
    peak: "Godziny szczytu",
    offpeak: "Godziny pozaszczytowe",
    peak_short: "Szczyt",
    offpeak_short: "Poza szczytem",
    ends_in: "koniec za {time}",
    then_period: "Potem {period}",
    current_price: "Aktualna cena",
    season: "Sezon {season}",
    days_left: "Zostało {left} z {total}",
    cost: "Szacowany koszt",
    this_month: "Ten miesiąc",
    subscription_incl: "z opłatą stałą",
    no_entity: "Nie znaleziono encji Tempo: skonfiguruj obsługiwaną integrację lub ustaw today_entity.",
    zoom_in: "Pokaż szczegóły",
    zoom_out: "Pokaż mniej",
    title: "Tytuł",
    today_entity: "Encja koloru dzisiejszego",
    tomorrow_entity: "Encja koloru jutrzejszego",
    offpeak_entity: "Encja godzin pozaszczytowych (czujnik binarny lub strefa taryfowa)",
    offpeak_hours: "Godziny pozaszczytowe (np. 22:00-06:00)",
    show_title: "Pokaż tytuł",
    show_subtitle: "Pokaż podtytuł",
    show_period: "Bieżąca strefa",
    show_season: "Pozostałe dni sezonu",
    show_cost: "Szacowany koszt",
    collapsed: "Zwinięte sekcje",
    zoom: "Przycisk szczegółów",
    zoom_helper: "Przełącza mini kartę na zawartość pełnej karty i z powrotem",
    indexes: "Wskazania licznika",
    prices: "Cennik (za kWh)",
    subscription: "Miesięczna opłata stała",
    days_left_entities: "Encje pozostałych dni",
    language: "Język",
    lang_auto: "Automatycznie (Home Assistant)",
  },
  sr: {
    card_title: "EDF Tempo",
    today: "Данас",
    tomorrow: "Сутра",
    blue: "Плави",
    white: "Бели",
    red: "Црвени",
    blue_day: "Плави дан",
    white_day: "Бели дан",
    red_day: "Црвени дан",
    unknown_day: "Још није познато",
    peak: "Виша тарифа",
    offpeak: "Нижа тарифа",
    peak_short: "ВТ",
    offpeak_short: "НТ",
    ends_in: "завршава се за {time}",
    then_period: "Затим {period}",
    current_price: "Тренутна цена",
    season: "Сезона {season}",
    days_left: "Преостало {left} од {total}",
    cost: "Процењени трошак",
    this_month: "Овај месец",
    subscription_incl: "са претплатом",
    no_entity: "Није пронађен ниједан Tempo ентитет: подесите подржану интеграцију или унесите today_entity.",
    zoom_in: "Прикажи детаље",
    zoom_out: "Прикажи мање",
    title: "Наслов",
    today_entity: "Ентитет данашње боје",
    tomorrow_entity: "Ентитет сутрашње боје",
    offpeak_entity: "Ентитет ниже тарифе (бинарни сензор или тарифни период)",
    offpeak_hours: "Нижа тарифа (нпр. 22:00-06:00)",
    show_title: "Прикажи наслов",
    show_subtitle: "Прикажи поднаслов",
    show_period: "Тренутни период",
    show_season: "Преостали дани сезоне",
    show_cost: "Процењени трошак",
    collapsed: "Скупљени одељци",
    zoom: "Дугме за детаље",
    zoom_helper: "Пребацује мини картицу на садржај пуне картице и назад",
    indexes: "Стања бројила",
    prices: "Ценовник (по kWh)",
    subscription: "Месечна претплата",
    days_left_entities: "Ентитети преосталих дана",
    language: "Језик",
    lang_auto: "Аутоматски (Home Assistant)",
  },
  "sr-Latn": {
    card_title: "EDF Tempo",
    today: "Danas",
    tomorrow: "Sutra",
    blue: "Plavi",
    white: "Beli",
    red: "Crveni",
    blue_day: "Plavi dan",
    white_day: "Beli dan",
    red_day: "Crveni dan",
    unknown_day: "Još nije poznato",
    peak: "Viša tarifa",
    offpeak: "Niža tarifa",
    peak_short: "VT",
    offpeak_short: "NT",
    ends_in: "završava se za {time}",
    then_period: "Zatim {period}",
    current_price: "Trenutna cena",
    season: "Sezona {season}",
    days_left: "Preostalo {left} od {total}",
    cost: "Procenjeni trošak",
    this_month: "Ovaj mesec",
    subscription_incl: "sa pretplatom",
    no_entity: "Nije pronađen nijedan Tempo entitet: podesite podržanu integraciju ili unesite today_entity.",
    zoom_in: "Prikaži detalje",
    zoom_out: "Prikaži manje",
    title: "Naslov",
    today_entity: "Entitet današnje boje",
    tomorrow_entity: "Entitet sutrašnje boje",
    offpeak_entity: "Entitet niže tarife (binarni senzor ili tarifni period)",
    offpeak_hours: "Niža tarifa (npr. 22:00-06:00)",
    show_title: "Prikaži naslov",
    show_subtitle: "Prikaži podnaslov",
    show_period: "Trenutni period",
    show_season: "Preostali dani sezone",
    show_cost: "Procenjeni trošak",
    collapsed: "Skupljeni odeljci",
    zoom: "Dugme za detalje",
    zoom_helper: "Prebacuje mini karticu na sadržaj pune kartice i nazad",
    indexes: "Stanja brojila",
    prices: "Cenovnik (po kWh)",
    subscription: "Mesečna pretplata",
    days_left_entities: "Entiteti preostalih dana",
    language: "Jezik",
    lang_auto: "Automatski (Home Assistant)",
  },
  ro: {
    card_title: "EDF Tempo",
    today: "Azi",
    tomorrow: "Mâine",
    blue: "Albastru",
    white: "Alb",
    red: "Roșu",
    blue_day: "Zi albastră",
    white_day: "Zi albă",
    red_day: "Zi roșie",
    unknown_day: "Încă necunoscută",
    peak: "Ore de vârf",
    offpeak: "Ore în afara vârfului",
    peak_short: "Vârf",
    offpeak_short: "În afara vârfului",
    ends_in: "se încheie în {time}",
    then_period: "Apoi {period}",
    current_price: "Preț curent",
    season: "Sezonul {season}",
    days_left: "Rămân {left} din {total}",
    cost: "Cost estimat",
    this_month: "Luna aceasta",
    subscription_incl: "abonament inclus",
    no_entity: "Nicio entitate Tempo găsită: configurați o integrare acceptată sau setați today_entity.",
    zoom_in: "Afișează detalii",
    zoom_out: "Afișează mai puțin",
    title: "Titlu",
    today_entity: "Entitatea culorii de azi",
    tomorrow_entity: "Entitatea culorii de mâine",
    offpeak_entity: "Entitate ore în afara vârfului (senzor binar sau interval tarifar)",
    offpeak_hours: "Ore în afara vârfului (ex. 22:00-06:00)",
    show_title: "Afișează titlul",
    show_subtitle: "Afișează subtitlul",
    show_period: "Intervalul curent",
    show_season: "Zile rămase din sezon",
    show_cost: "Cost estimat",
    collapsed: "Secțiuni restrânse",
    zoom: "Buton de detalii",
    zoom_helper: "Comută mini cardul la conținutul cardului complet și înapoi",
    indexes: "Indexurile contorului",
    prices: "Grilă de prețuri (per kWh)",
    subscription: "Abonament lunar",
    days_left_entities: "Entitățile zilelor rămase",
    language: "Limbă",
    lang_auto: "Automat (Home Assistant)",
  },
  da: {
    card_title: "EDF Tempo",
    today: "I dag",
    tomorrow: "I morgen",
    blue: "Blå",
    white: "Hvid",
    red: "Rød",
    blue_day: "Blå dag",
    white_day: "Hvid dag",
    red_day: "Rød dag",
    unknown_day: "Endnu ikke kendt",
    peak: "Spidslast",
    offpeak: "Lavlast",
    peak_short: "Spids",
    offpeak_short: "Lav",
    ends_in: "slutter om {time}",
    then_period: "Derefter {period}",
    current_price: "Aktuel pris",
    season: "Sæson {season}",
    days_left: "{left} af {total} tilbage",
    cost: "Anslået pris",
    this_month: "Denne måned",
    subscription_incl: "inkl. abonnement",
    no_entity: "Ingen Tempo-entitet fundet: opsæt en understøttet integration eller angiv today_entity.",
    zoom_in: "Vis detaljer",
    zoom_out: "Vis mindre",
    title: "Titel",
    today_entity: "Entitet for dagens farve",
    tomorrow_entity: "Entitet for morgendagens farve",
    offpeak_entity: "Lavlast-entitet (binær sensor eller tarifperiode)",
    offpeak_hours: "Lavlasttimer (f.eks. 22:00-06:00)",
    show_title: "Vis titel",
    show_subtitle: "Vis undertitel",
    show_period: "Aktuel periode",
    show_season: "Resterende dage i sæsonen",
    show_cost: "Anslået pris",
    collapsed: "Sammenfoldede sektioner",
    zoom: "Detaljeknap",
    zoom_helper: "Skifter minikortet til det fulde korts indhold og tilbage",
    indexes: "Målerstande",
    prices: "Pristabel (pr. kWh)",
    subscription: "Månedligt abonnement",
    days_left_entities: "Entiteter for resterende dage",
    language: "Sprog",
    lang_auto: "Automatisk (Home Assistant)",
  },
  sv: {
    card_title: "EDF Tempo",
    today: "I dag",
    tomorrow: "I morgon",
    blue: "Blå",
    white: "Vit",
    red: "Röd",
    blue_day: "Blå dag",
    white_day: "Vit dag",
    red_day: "Röd dag",
    unknown_day: "Ännu inte känd",
    peak: "Högpristid",
    offpeak: "Lågpristid",
    peak_short: "Hög",
    offpeak_short: "Låg",
    ends_in: "slutar om {time}",
    then_period: "Sedan {period}",
    current_price: "Aktuellt pris",
    season: "Säsong {season}",
    days_left: "{left} av {total} kvar",
    cost: "Uppskattad kostnad",
    this_month: "Den här månaden",
    subscription_incl: "inkl. abonnemang",
    no_entity: "Ingen Tempo-entitet hittades: konfigurera en integration som stöds eller ange today_entity.",
    zoom_in: "Visa detaljer",
    zoom_out: "Visa mindre",
    title: "Titel",
    today_entity: "Entitet för dagens färg",
    tomorrow_entity: "Entitet för morgondagens färg",
    offpeak_entity: "Lågpris-entitet (binär sensor eller tariffperiod)",
    offpeak_hours: "Lågpristid (t.ex. 22:00-06:00)",
    show_title: "Visa titel",
    show_subtitle: "Visa underrubrik",
    show_period: "Aktuell period",
    show_season: "Återstående dagar av säsongen",
    show_cost: "Uppskattad kostnad",
    collapsed: "Hopfällda avsnitt",
    zoom: "Detaljknapp",
    zoom_helper: "Växlar minikortet till hela kortets innehåll och tillbaka",
    indexes: "Mätarställningar",
    prices: "Pristabell (per kWh)",
    subscription: "Månadsabonnemang",
    days_left_entities: "Entiteter för återstående dagar",
    language: "Språk",
    lang_auto: "Automatiskt (Home Assistant)",
  },
  bg: {
    card_title: "EDF Tempo",
    today: "Днес",
    tomorrow: "Утре",
    blue: "Син",
    white: "Бял",
    red: "Червен",
    blue_day: "Син ден",
    white_day: "Бял ден",
    red_day: "Червен ден",
    unknown_day: "Все още неизвестен",
    peak: "Върхови часове",
    offpeak: "Извънвърхови часове",
    peak_short: "Връх",
    offpeak_short: "Извън връх",
    ends_in: "приключва след {time}",
    then_period: "След това {period}",
    current_price: "Текуща цена",
    season: "Сезон {season}",
    days_left: "Остават {left} от {total}",
    cost: "Прогнозна цена",
    this_month: "Този месец",
    subscription_incl: "с абонамент",
    no_entity: "Не е намерен обект Tempo: настройте поддържана интеграция или задайте today_entity.",
    zoom_in: "Покажи подробности",
    zoom_out: "Покажи по-малко",
    title: "Заглавие",
    today_entity: "Обект за цвета днес",
    tomorrow_entity: "Обект за цвета утре",
    offpeak_entity: "Обект за извънвърхови часове (двоичен сензор или тарифен период)",
    offpeak_hours: "Извънвърхови часове (напр. 22:00-06:00)",
    show_title: "Покажи заглавието",
    show_subtitle: "Покажи подзаглавието",
    show_period: "Текущ период",
    show_season: "Оставащи дни от сезона",
    show_cost: "Прогнозна цена",
    collapsed: "Свити секции",
    zoom: "Бутон за подробности",
    zoom_helper: "Превключва мини картата към съдържанието на пълната карта и обратно",
    indexes: "Показания на електромера",
    prices: "Ценова таблица (за kWh)",
    subscription: "Месечен абонамент",
    days_left_entities: "Обекти за оставащите дни",
    language: "Език",
    lang_auto: "Автоматично (Home Assistant)",
  },
  ru: {
    card_title: "EDF Tempo",
    today: "Сегодня",
    tomorrow: "Завтра",
    blue: "Синий",
    white: "Белый",
    red: "Красный",
    blue_day: "Синий день",
    white_day: "Белый день",
    red_day: "Красный день",
    unknown_day: "Ещё неизвестно",
    peak: "Пиковые часы",
    offpeak: "Льготные часы",
    peak_short: "Пик",
    offpeak_short: "Льгота",
    ends_in: "закончится через {time}",
    then_period: "Затем {period}",
    current_price: "Текущая цена",
    season: "Сезон {season}",
    days_left: "Осталось {left} из {total}",
    cost: "Расчётная стоимость",
    this_month: "Этот месяц",
    subscription_incl: "с абонентской платой",
    no_entity: "Объект Tempo не найден: настройте поддерживаемую интеграцию или укажите today_entity.",
    zoom_in: "Показать подробности",
    zoom_out: "Показать меньше",
    title: "Заголовок",
    today_entity: "Объект цвета сегодня",
    tomorrow_entity: "Объект цвета завтра",
    offpeak_entity: "Объект льготных часов (бинарный датчик или тарифная зона)",
    offpeak_hours: "Льготные часы (напр. 22:00-06:00)",
    show_title: "Показывать заголовок",
    show_subtitle: "Показывать подзаголовок",
    show_period: "Текущая зона",
    show_season: "Оставшиеся дни сезона",
    show_cost: "Расчётная стоимость",
    collapsed: "Свёрнутые разделы",
    zoom: "Кнопка подробностей",
    zoom_helper: "Переключает мини-карточку на содержимое полной карточки и обратно",
    indexes: "Показания счётчика",
    prices: "Тарифная сетка (за kWh)",
    subscription: "Ежемесячная абонентская плата",
    days_left_entities: "Объекты оставшихся дней",
    language: "Язык",
    lang_auto: "Автоматически (Home Assistant)",
  },
  uk: {
    card_title: "EDF Tempo",
    today: "Сьогодні",
    tomorrow: "Завтра",
    blue: "Синій",
    white: "Білий",
    red: "Червоний",
    blue_day: "Синій день",
    white_day: "Білий день",
    red_day: "Червоний день",
    unknown_day: "Ще невідомо",
    peak: "Пікові години",
    offpeak: "Пільгові години",
    peak_short: "Пік",
    offpeak_short: "Пільга",
    ends_in: "закінчиться через {time}",
    then_period: "Потім {period}",
    current_price: "Поточна ціна",
    season: "Сезон {season}",
    days_left: "Залишилось {left} з {total}",
    cost: "Орієнтовна вартість",
    this_month: "Цей місяць",
    subscription_incl: "з абонплатою",
    no_entity: "Об'єкт Tempo не знайдено: налаштуйте підтримувану інтеграцію або вкажіть today_entity.",
    zoom_in: "Показати подробиці",
    zoom_out: "Показати менше",
    title: "Заголовок",
    today_entity: "Об'єкт кольору сьогодні",
    tomorrow_entity: "Об'єкт кольору завтра",
    offpeak_entity: "Об'єкт пільгових годин (бінарний датчик або тарифна зона)",
    offpeak_hours: "Пільгові години (напр. 22:00-06:00)",
    show_title: "Показувати заголовок",
    show_subtitle: "Показувати підзаголовок",
    show_period: "Поточна зона",
    show_season: "Залишок днів сезону",
    show_cost: "Орієнтовна вартість",
    collapsed: "Згорнуті розділи",
    zoom: "Кнопка подробиць",
    zoom_helper: "Перемикає міні-картку на вміст повної картки і назад",
    indexes: "Показники лічильника",
    prices: "Тарифна сітка (за kWh)",
    subscription: "Щомісячна абонплата",
    days_left_entities: "Об'єкти днів, що залишились",
    language: "Мова",
    lang_auto: "Автоматично (Home Assistant)",
  },
  hu: {
    card_title: "EDF Tempo",
    today: "Ma",
    tomorrow: "Holnap",
    blue: "Kék",
    white: "Fehér",
    red: "Piros",
    blue_day: "Kék nap",
    white_day: "Fehér nap",
    red_day: "Piros nap",
    unknown_day: "Még nem ismert",
    peak: "Csúcsidő",
    offpeak: "Völgyidő",
    peak_short: "Csúcs",
    offpeak_short: "Völgy",
    ends_in: "vége {time} múlva",
    then_period: "Utána {period}",
    current_price: "Aktuális ár",
    season: "{season} szezon",
    days_left: "{total}-ből {left} maradt",
    cost: "Becsült költség",
    this_month: "Ebben a hónapban",
    subscription_incl: "alapdíjjal",
    no_entity: "Nem található Tempo entitás: állíts be egy támogatott integrációt, vagy add meg a today_entity értékét.",
    zoom_in: "Részletek",
    zoom_out: "Kevesebb",
    title: "Cím",
    today_entity: "Mai szín entitása",
    tomorrow_entity: "Holnapi szín entitása",
    offpeak_entity: "Völgyidő entitás (bináris érzékelő vagy tarifaidőszak)",
    offpeak_hours: "Völgyidő (pl. 22:00-06:00)",
    show_title: "Cím megjelenítése",
    show_subtitle: "Alcím megjelenítése",
    show_period: "Aktuális időszak",
    show_season: "A szezon hátralévő napjai",
    show_cost: "Becsült költség",
    collapsed: "Összecsukott szakaszok",
    zoom: "Részletek gomb",
    zoom_helper: "A mini kártyát a teljes kártya tartalmára váltja és vissza",
    indexes: "Mérőállások",
    prices: "Ártáblázat (kWh-nként)",
    subscription: "Havi alapdíj",
    days_left_entities: "Hátralévő napok entitásai",
    language: "Nyelv",
    lang_auto: "Automatikus (Home Assistant)",
  },
  sk: {
    card_title: "EDF Tempo",
    today: "Dnes",
    tomorrow: "Zajtra",
    blue: "Modrý",
    white: "Biely",
    red: "Červený",
    blue_day: "Modrý deň",
    white_day: "Biely deň",
    red_day: "Červený deň",
    unknown_day: "Zatiaľ neznámy",
    peak: "Vysoká tarifa",
    offpeak: "Nízka tarifa",
    peak_short: "VT",
    offpeak_short: "NT",
    ends_in: "končí o {time}",
    then_period: "Potom {period}",
    current_price: "Aktuálna cena",
    season: "Sezóna {season}",
    days_left: "Zostáva {left} z {total}",
    cost: "Odhadované náklady",
    this_month: "Tento mesiac",
    subscription_incl: "vrátane paušálu",
    no_entity: "Nenašla sa žiadna entita Tempo: nastavte podporovanú integráciu alebo zadajte today_entity.",
    zoom_in: "Zobraziť podrobnosti",
    zoom_out: "Zobraziť menej",
    title: "Názov",
    today_entity: "Entita dnešnej farby",
    tomorrow_entity: "Entita zajtrajšej farby",
    offpeak_entity: "Entita nízkej tarify (binárny senzor alebo tarifné pásmo)",
    offpeak_hours: "Nízka tarifa (napr. 22:00-06:00)",
    show_title: "Zobraziť názov",
    show_subtitle: "Zobraziť podnadpis",
    show_period: "Aktuálne pásmo",
    show_season: "Zostávajúce dni sezóny",
    show_cost: "Odhadované náklady",
    collapsed: "Zbalené sekcie",
    zoom: "Tlačidlo podrobností",
    zoom_helper: "Prepne mini kartu na obsah plnej karty a späť",
    indexes: "Stavy elektromera",
    prices: "Cenník (za kWh)",
    subscription: "Mesačný paušál",
    days_left_entities: "Entity zostávajúcich dní",
    language: "Jazyk",
    lang_auto: "Automaticky (Home Assistant)",
  },
  cs: {
    card_title: "EDF Tempo",
    today: "Dnes",
    tomorrow: "Zítra",
    blue: "Modrý",
    white: "Bílý",
    red: "Červený",
    blue_day: "Modrý den",
    white_day: "Bílý den",
    red_day: "Červený den",
    unknown_day: "Zatím neznámý",
    peak: "Vysoký tarif",
    offpeak: "Nízký tarif",
    peak_short: "VT",
    offpeak_short: "NT",
    ends_in: "končí za {time}",
    then_period: "Potom {period}",
    current_price: "Aktuální cena",
    season: "Sezóna {season}",
    days_left: "Zbývá {left} z {total}",
    cost: "Odhadované náklady",
    this_month: "Tento měsíc",
    subscription_incl: "včetně paušálu",
    no_entity: "Nebyla nalezena žádná entita Tempo: nastavte podporovanou integraci nebo zadejte today_entity.",
    zoom_in: "Zobrazit podrobnosti",
    zoom_out: "Zobrazit méně",
    title: "Název",
    today_entity: "Entita dnešní barvy",
    tomorrow_entity: "Entita zítřejší barvy",
    offpeak_entity: "Entita nízkého tarifu (binární senzor nebo tarifní pásmo)",
    offpeak_hours: "Nízký tarif (např. 22:00-06:00)",
    show_title: "Zobrazit název",
    show_subtitle: "Zobrazit podtitul",
    show_period: "Aktuální pásmo",
    show_season: "Zbývající dny sezóny",
    show_cost: "Odhadované náklady",
    collapsed: "Sbalené sekce",
    zoom: "Tlačítko podrobností",
    zoom_helper: "Přepne mini kartu na obsah plné karty a zpět",
    indexes: "Stavy elektroměru",
    prices: "Ceník (za kWh)",
    subscription: "Měsíční paušál",
    days_left_entities: "Entity zbývajících dnů",
    language: "Jazyk",
    lang_auto: "Automaticky (Home Assistant)",
  },
  sl: {
    card_title: "EDF Tempo",
    today: "Danes",
    tomorrow: "Jutri",
    blue: "Modri",
    white: "Beli",
    red: "Rdeči",
    blue_day: "Modri dan",
    white_day: "Beli dan",
    red_day: "Rdeči dan",
    unknown_day: "Še ni znano",
    peak: "Višja tarifa",
    offpeak: "Nižja tarifa",
    peak_short: "VT",
    offpeak_short: "MT",
    ends_in: "konča se čez {time}",
    then_period: "Nato {period}",
    current_price: "Trenutna cena",
    season: "Sezona {season}",
    days_left: "Ostaja {left} od {total}",
    cost: "Ocenjeni strošek",
    this_month: "Ta mesec",
    subscription_incl: "z naročnino",
    no_entity: "Ni najdene entitete Tempo: nastavite podprto integracijo ali vnesite today_entity.",
    zoom_in: "Pokaži podrobnosti",
    zoom_out: "Pokaži manj",
    title: "Naslov",
    today_entity: "Entiteta današnje barve",
    tomorrow_entity: "Entiteta jutrišnje barve",
    offpeak_entity: "Entiteta nižje tarife (binarni senzor ali tarifni blok)",
    offpeak_hours: "Nižja tarifa (npr. 22:00-06:00)",
    show_title: "Pokaži naslov",
    show_subtitle: "Pokaži podnaslov",
    show_period: "Trenutni blok",
    show_season: "Preostali dnevi sezone",
    show_cost: "Ocenjeni strošek",
    collapsed: "Strnjeni razdelki",
    zoom: "Gumb za podrobnosti",
    zoom_helper: "Preklopi mini kartico na vsebino polne kartice in nazaj",
    indexes: "Stanja števca",
    prices: "Cenik (na kWh)",
    subscription: "Mesečna naročnina",
    days_left_entities: "Entitete preostalih dni",
    language: "Jezik",
    lang_auto: "Samodejno (Home Assistant)",
  },
  lv: {
    card_title: "EDF Tempo",
    today: "Šodien",
    tomorrow: "Rīt",
    blue: "Zils",
    white: "Balts",
    red: "Sarkans",
    blue_day: "Zilā diena",
    white_day: "Baltā diena",
    red_day: "Sarkanā diena",
    unknown_day: "Vēl nav zināms",
    peak: "Maksimālās slodzes stundas",
    offpeak: "Zemās slodzes stundas",
    peak_short: "Maks.",
    offpeak_short: "Zema",
    ends_in: "beigsies pēc {time}",
    then_period: "Pēc tam {period}",
    current_price: "Pašreizējā cena",
    season: "Sezona {season}",
    days_left: "Atlikušas {left} no {total}",
    cost: "Aptuvenās izmaksas",
    this_month: "Šomēnes",
    subscription_incl: "ar abonēšanas maksu",
    no_entity: "Netika atrasta neviena Tempo entītija: iestatiet atbalstītu integrāciju vai norādiet today_entity.",
    zoom_in: "Rādīt detaļas",
    zoom_out: "Rādīt mazāk",
    title: "Virsraksts",
    today_entity: "Šodienas krāsas entītija",
    tomorrow_entity: "Rītdienas krāsas entītija",
    offpeak_entity: "Zemās slodzes entītija (binārais sensors vai tarifa periods)",
    offpeak_hours: "Zemās slodzes stundas (piem. 22:00-06:00)",
    show_title: "Rādīt virsrakstu",
    show_subtitle: "Rādīt apakšvirsrakstu",
    show_period: "Pašreizējais periods",
    show_season: "Atlikušās sezonas dienas",
    show_cost: "Aptuvenās izmaksas",
    collapsed: "Sakļautās sadaļas",
    zoom: "Detaļu poga",
    zoom_helper: "Pārslēdz mini karti uz pilnās kartes saturu un atpakaļ",
    indexes: "Skaitītāja rādījumi",
    prices: "Cenu tabula (par kWh)",
    subscription: "Mēneša abonēšanas maksa",
    days_left_entities: "Atlikušo dienu entītijas",
    language: "Valoda",
    lang_auto: "Automātiski (Home Assistant)",
  },
  el: {
    card_title: "EDF Tempo",
    today: "Σήμερα",
    tomorrow: "Αύριο",
    blue: "Μπλε",
    white: "Λευκή",
    red: "Κόκκινη",
    blue_day: "Μπλε ημέρα",
    white_day: "Λευκή ημέρα",
    red_day: "Κόκκινη ημέρα",
    unknown_day: "Δεν είναι ακόμη γνωστό",
    peak: "Ώρες αιχμής",
    offpeak: "Ώρες εκτός αιχμής",
    peak_short: "Αιχμή",
    offpeak_short: "Εκτός αιχμής",
    ends_in: "λήγει σε {time}",
    then_period: "Μετά {period}",
    current_price: "Τρέχουσα τιμή",
    season: "Περίοδος {season}",
    days_left: "Απομένουν {left} από {total}",
    cost: "Εκτιμώμενο κόστος",
    this_month: "Αυτόν τον μήνα",
    subscription_incl: "με πάγιο",
    no_entity: "Δεν βρέθηκε οντότητα Tempo: ρυθμίστε μια υποστηριζόμενη ενσωμάτωση ή ορίστε το today_entity.",
    zoom_in: "Εμφάνιση λεπτομερειών",
    zoom_out: "Λιγότερα",
    title: "Τίτλος",
    today_entity: "Οντότητα χρώματος σήμερα",
    tomorrow_entity: "Οντότητα χρώματος αύριο",
    offpeak_entity: "Οντότητα εκτός αιχμής (δυαδικός αισθητήρας ή ζώνη χρέωσης)",
    offpeak_hours: "Ώρες εκτός αιχμής (π.χ. 22:00-06:00)",
    show_title: "Εμφάνιση τίτλου",
    show_subtitle: "Εμφάνιση υπότιτλου",
    show_period: "Τρέχουσα ζώνη",
    show_season: "Υπόλοιπες ημέρες περιόδου",
    show_cost: "Εκτιμώμενο κόστος",
    collapsed: "Συμπτυγμένες ενότητες",
    zoom: "Κουμπί λεπτομερειών",
    zoom_helper: "Αλλάζει τη μίνι κάρτα στο περιεχόμενο της πλήρους κάρτας και πίσω",
    indexes: "Ενδείξεις μετρητή",
    prices: "Τιμοκατάλογος (ανά kWh)",
    subscription: "Μηνιαίο πάγιο",
    days_left_entities: "Οντότητες υπόλοιπων ημερών",
    language: "Γλώσσα",
    lang_auto: "Αυτόματα (Home Assistant)",
  },
};

const LANGUAGES = [
  ["en", "English"],
  ["fr", "Français"],
  ["de", "Deutsch"],
  ["es", "Español"],
  ["sr", "Српски"],
  ["sr-Latn", "Srpski (latinica)"],
  ["it", "Italiano"],
  ["nl", "Nederlands"],
  ["pt", "Português (Portugal)"],
  ["pl", "Polski"],
  ["ro", "Română"],
  ["da", "Dansk"],
  ["sv", "Svenska"],
  ["bg", "Български"],
  ["ru", "Русский"],
  ["uk", "Українська"],
  ["hu", "Magyar"],
  ["sk", "Slovenčina"],
  ["cs", "Čeština"],
  ["sl", "Slovenščina"],
  ["lv", "Latviešu"],
  ["el", "Ελληνικά"],
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const lang = (hass, config) => {
  const l = config?.language || (hass && (hass.locale?.language || hass.language)) || "en";
  return STRINGS[l] ? l : STRINGS[l.split("-")[0]] ? l.split("-")[0] : "en";
};

// Locale for Intl: the card's language, with HA's region when it matches (pt-BR, de-CH); a bare "pt" is European.
const intlLocale = (hass, config) => {
  const l = lang(hass, config);
  const src = config?.language || (hass && (hass.locale?.language || hass.language)) || "";
  const out = src && src.split("-")[0] === l.split("-")[0] ? src : l;
  return out === "pt" ? "pt-PT" : out;
};

const t = (hass, config, key, vars = {}) =>
  String(STRINGS[lang(hass, config)][key] ?? STRINGS.en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

const valid = (s) => !!s && !["unknown", "unavailable", ""].includes(s.state);

const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const svgIcon = (path, cls = "") => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;

// Lower case without accents, to read color and period names in any of the integrations' spellings.
const fold = (v) =>
  String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

// Tempo color of a state or attribute value: "Bleu", "blanc", "ROUGE", "BLEU"/"BLAN"/"ROUG" (TIC DEMAIN), "HPJR"
// (TIC PTEC), "HC BLEU" (TIC LTARF), "Bleu HP" (EDF Tempo), "blue", 1-3, or the emoji of RTE Tempo. null: unknown.
const colorOf = (v) => {
  if (v === null || v === undefined || typeof v === "boolean") return null;
  const s = fold(v);
  const ptec = s.match(/^h[pc]j([bwr])$/);
  if (ptec) return { b: "blue", w: "white", r: "red" }[ptec[1]];
  if (s === "1" || s.includes("🔵") || /(^|[^a-z])(bleu|blue)/.test(s)) return "blue";
  if (s === "2" || s.includes("⚪") || /(^|[^a-z])(blanc?|white)([^a-z]|$)/.test(s)) return "white";
  if (s === "3" || s.includes("🔴") || /(^|[^a-z])(rouge?|red)([^a-z]|$)/.test(s)) return "red";
  return null;
};

// Off-peak ("hc") or peak ("hp") of a value: a binary sensor (on = off-peak), "HC"/"HP", "HCJB" (PTEC), "HC BLEU"
// (LTARF), "Bleu HP", "Heures creuses", "off-peak". null: unknown.
const periodOf = (v) => {
  if (v === true || v === "on") return "hc";
  if (v === false || v === "off") return "hp";
  const s = fold(v);
  if (/(^|[^a-z])hc|creuse|off.?peak/.test(s)) return "hc";
  if (/(^|[^a-z])hp|pleine|peak/.test(s)) return "hp";
  return null;
};

// Off-peak ranges as [start, end] minutes since midnight, from "22:00-06:00" or a list of them ("12:30-14:30").
const parseRanges = (value) => {
  const list = Array.isArray(value) ? value : String(value || DEFAULT_OFFPEAK).split(/[,;]/);
  const ranges = [];
  for (const item of list) {
    const m = String(item).match(/(\d{1,2})[:h](\d{2})\s*[-–>à]+\s*(\d{1,2})[:h](\d{2})/);
    if (m) ranges.push([Number(m[1]) * 60 + Number(m[2]), Number(m[3]) * 60 + Number(m[4])]);
  }
  return ranges.length ? ranges : parseRanges(DEFAULT_OFFPEAK);
};

// Wall-clock time of an instant in a time zone: { y, mo (1-12), d, h, mi, s }.
const WALL = {};
const wall = (ms, tz) => {
  let f = WALL[tz];
  if (!f) {
    try {
      f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
    } catch (_err) {
      return wall(ms, DEFAULT_TZ);
    }
    WALL[tz] = f;
  }
  const p = {};
  for (const x of f.formatToParts(new Date(ms))) if (x.type !== "literal") p[x.type] = Number(x.value);
  return { y: p.year, mo: p.month, d: p.day, h: p.hour % 24, mi: p.minute, s: p.second };
};

// Instant of a wall-clock time in a time zone; the day and the minutes may overflow (day 0, minute 1500).
const epochOf = (tz, y, mo, d, minutes = 0) => {
  const guess = Date.UTC(y, mo - 1, d, 0, minutes);
  const w = wall(guess, tz);
  return guess - (Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi) - guess);
};

// Calendar date { y, mo, d } a number of days after another one.
const addDays = ({ y, mo, d }, n) => {
  const x = new Date(Date.UTC(y, mo - 1, d + n));
  return { y: x.getUTCFullYear(), mo: x.getUTCMonth() + 1, d: x.getUTCDate() };
};

// The Tempo day an instant belongs to (06:00 to 06:00): before 06:00, the day before.
const tempoDay = (ms, tz) => {
  const w = wall(ms, tz);
  return w.h * 60 + w.mi < DAY_START_MIN ? addDays(w, -1) : { y: w.y, mo: w.mo, d: w.d };
};

// Current period from the off-peak ranges: { period, start, end } with the instants of its bounds.
const periodAt = (ms, tz, ranges) => {
  const w = wall(ms, tz);
  const minute = w.h * 60 + w.mi + w.s / 60;
  const segs = [];
  for (const day of [-1, 0, 1]) for (const [a, b] of ranges) segs.push([day * 1440 + a, day * 1440 + (b <= a ? b + 1440 : b)]);
  segs.sort((x, y) => x[0] - y[0]);
  const on = segs.find(([a, b]) => minute >= a && minute < b);
  const at = (m) => epochOf(tz, w.y, w.mo, w.d, m);
  if (on) return { period: "hc", start: at(on[0]), end: at(on[1]) };
  const before = Math.max(...segs.filter(([, b]) => b <= minute).map(([, b]) => b));
  const after = Math.min(...segs.filter(([a]) => a > minute).map(([a]) => a));
  return { period: "hp", start: at(before), end: at(after) };
};

// Season (1 September to 31 August) of a Tempo day: its first year and its length in days.
const seasonOf = (day) => {
  const y = day.mo >= 9 ? day.y : day.y - 1;
  return { y, days: Math.round((Date.UTC(y + 1, 8, 1) - Date.UTC(y, 8, 1)) / 86400000) };
};

const seasonTotal = (color, season) => SEASON_TOTALS[color] ?? season.days - SEASON_TOTALS.white - SEASON_TOTALS.red;

const UNIT_FMT = {};
const fmtUnit = (v, unit, locale) => (UNIT_FMT[`${locale}|${unit}`] ??= new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "short" })).format(v);

// Duration until an instant: "6 hr 18 min", "12 min".
const fmtDuration = (ms, locale) => {
  const total = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${fmtUnit(h, "hour", locale)} ${fmtUnit(m, "minute", locale)}` : fmtUnit(m, "minute", locale);
};

const fmtTime = (ms, tz, locale) => {
  try {
    return new Date(ms).toLocaleTimeString(locale, { timeZone: tz, hour: "numeric", minute: "2-digit" });
  } catch (_err) {
    return new Date(ms).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  }
};

const fmtDate = (day, locale) => new Date(Date.UTC(day.y, day.mo - 1, day.d, 12)).toLocaleDateString(locale, { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });

const fmtMoney = (v, currency, locale, digits = 2) => {
  if (v === null || v === undefined) return "—";
  try {
    return Number(v).toLocaleString(locale, { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits });
  } catch (_err) {
    return `${Number(v).toFixed(digits)} ${currency}`;
  }
};

const fmtNum = (v, digits, locale) => (v === null || v === undefined ? "—" : Number(v).toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }));

// ---------------------------------------------------------------------------
// Entity discovery
// ---------------------------------------------------------------------------

// A source is { entity, attr }: the state of the entity, or one of its attributes.
const src = (entity, attr) => (entity ? { entity, attr } : null);

// The text that tells the entities of an integration apart: entity id and name (they are fixed, in French, by the
// integrations that have no translation keys).
const label = (hass, id) => fold(`${id} ${hass.states[id]?.attributes?.friendly_name ?? ""}`).replace(/[^a-z0-9]+/g, "_");

const COLOR_WORDS = { blue: "(bleu|blue)", white: "(blanc|white)", red: "(rouge|red)" };

// What the integrations found in the entity registry provide, each key with the first entity found:
// today, tomorrow, period (off-peak flag or tariff period), change (next off-peak / peak change), days_left_<color>,
// <color>_<period> (meter indexes) and price_<color>_<period>.
// Integrations in order of preference when several provide the same thing (the Tempo services before the meter).
const RANK = { rtetempo: 0, tarif_edf: 1, tempo: 2, linkytic: 3, mqtt: 4 };

const discover = (hass) => {
  const found = {};
  let rank = 0;
  const put = (key, value) => {
    if (value && (!found[key] || found[key].rank > rank)) found[key] = { rank, value };
  };
  // Tarif EDF's colors of yesterday, today and tomorrow are calendar days: matched after the loop.
  const edf = {};
  for (const e of Object.values(hass.entities || {})) {
    rank = RANK[e.platform];
    const id = e.entity_id;
    if (rank === undefined || !id || !hass.states[id]) continue;
    const l = label(hass, id);
    const domain = id.split(".")[0];
    switch (e.platform) {
      // RTE Tempo (hekmon/rtetempo): French entity names; the "(visuel)" twins carry emoji.
      case "rtetempo":
        if (domain === "binary_sensor") put("period", src(id));
        else if (/visuel/.test(l)) break;
        else if (/couleur_actuelle/.test(l)) put("today", src(id));
        else if (/prochaine_couleur(?!_changement)/.test(l)) put("tomorrow", src(id));
        else if (/heures_creuses_changement/.test(l)) put("change", src(id));
        else if (/jours_restants/.test(l)) for (const c of COLORS) if (new RegExp(COLOR_WORDS[c]).test(l)) put(`days_left_${c}`, src(id));
        break;
      // Tarif EDF (delphiki/hass-tarif-edf): colors of the calendar days and the Tempo prices.
      case "tarif_edf":
        if (/couleur_hier/.test(l)) edf.yesterday ??= id;
        else if (/couleur_aujourd/.test(l)) edf.today ??= id;
        else if (/couleur_demain/.test(l)) edf.tomorrow ??= id;
        else if (/tempo/.test(l))
          for (const c of COLORS)
            for (const [p, word] of [
              ["hc", "creuses"],
              ["hp", "pleines"],
            ])
              if (new RegExp(COLOR_WORDS[c]).test(l) && l.includes(word)) put(`price_${c}_${p}`, src(id));
        break;
      // EDF Tempo (chrisbansart/ha_tempo): one sensor, everything in its attributes.
      case "tempo": {
        const a = hass.states[id].attributes || {};
        if ("today_color" in a) {
          put("today", src(id, "today_color"));
          put("tomorrow", src(id, "tomorrow_color"));
          put("period", src(id, "current_period"));
        }
        break;
      }
      // Linky TIC (hekmon/linkytic): translation keys, historic (BBR…, PTEC, DEMAIN) and standard (EASF, LTARF).
      case "linkytic": {
        const k = e.translation_key || "";
        const tempo = k.match(/^index_tempo_(blue|white|red)(hc|hp)$/);
        if (tempo) put(`${tempo[1]}_${tempo[2]}`, src(id));
        else if (k === "tomorrow_color" || k === "status_tempo_color_tomorrow") put("tomorrow", src(id));
        else if (k === "status_tempo_color_today") put("today", src(id));
        else if (k === "current_tarif" || k === "current_tarif_label") {
          put("today", src(id));
          put("period", src(id));
        } else {
          const easf = k.match(/^active_energy_provider_([1-6])$/);
          if (easf) put(`linky_${easf[1]}`, src(id));
        }
        break;
      }
      // ZLinky_TIC through Zigbee2MQTT: entity ids end with the exposed property.
      case "mqtt": {
        const m = id.match(/_(tomorrow_color|active_register_tier_delivered|current_price|current_tier([1-6])_summ_delivered)$/);
        if (!m) break;
        if (m[1] === "tomorrow_color") put("tomorrow", src(id));
        else if (m[2]) put(`linky_${m[2]}`, src(id));
        else {
          put("today", src(id));
          put("period", src(id));
        }
        break;
      }
    }
  }
  // A Tempo day starts at 06:00: before then, the day being lived is the calendar day before (`early`).
  rank = RANK.tarif_edf;
  if (edf.today) put("today", { ...src(edf.today), early: src(edf.yesterday) });
  if (edf.tomorrow) put("tomorrow", { ...src(edf.tomorrow), early: src(edf.today) });
  const out = Object.fromEntries(Object.entries(found).map(([k, v]) => [k, v.value]));
  // Standard (EASF01-06) and Zigbee (tier 1-6) indexes are Tempo indexes only on a Tempo meter (a Tempo color read).
  const linkyTempo = ["today", "tomorrow"].some((k) => out[k] && colorOf(readSrc(hass, out[k])));
  INDEX_KEYS.forEach((key, i) => {
    if (linkyTempo && !out[key] && out[`linky_${i + 1}`]) out[key] = out[`linky_${i + 1}`];
    delete out[`linky_${i + 1}`];
  });
  return out;
};

const readSrc = (hass, s) => {
  const st = s && hass.states[s.entity];
  if (!valid(st)) return undefined;
  return s.attr ? st.attributes?.[s.attr] : st.state;
};

// Discovery is redone only when the registry or the list of states changed.
const DISCOVERED = new WeakMap();
const discovered = (hass) => {
  const key = hass.entities || hass.states;
  let hit = DISCOVERED.get(key);
  if (!hit || hit.states !== hass.states) {
    hit = { states: hass.states, out: discover(hass) };
    DISCOVERED.set(key, hit);
  }
  return hit.out;
};

// The sources the card reads, the options first: { today, tomorrow, period, change, days_left_<color>, <index keys>,
// price_<index keys> }.
const sourcesOf = (hass, config) => {
  const found = discovered(hass);
  const c = config || {};
  const opt = (v) => (typeof v === "string" && v.includes(".") ? src(v) : null);
  const out = {
    today: opt(c.today_entity) || found.today || null,
    tomorrow: opt(c.tomorrow_entity) || found.tomorrow || null,
    period: opt(c.offpeak_entity) || found.period || null,
    change: found.change || null,
  };
  for (const color of COLORS) out[`days_left_${color}`] = opt(c.days_left?.[color]) || found[`days_left_${color}`] || null;
  for (const key of INDEX_KEYS) {
    out[key] = opt(c.indexes?.[key]) || found[key] || null;
    const p = c.prices?.[key];
    out[`price_${key}`] = typeof p === "number" ? { value: p } : opt(p) || (c.prices?.[key] === undefined && found[`price_${key}`]) || { value: DEFAULT_PRICES[key] };
  }
  return out;
};

// Price of an index key: the number, or the entity's state; the default grid while a price entity is unreadable.
const priceOf = (hass, s, key) => (s?.value !== undefined ? s.value : (num(readSrc(hass, s)) ?? DEFAULT_PRICES[key] ?? null));

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const BASE_STYLE = `
  :host { --tc-blue: #2563eb; --tc-white: #f7f7f4; --tc-white-tint: #8a94a0; --tc-red: #dc2626;
          --tc-ok: var(--success-color, #43a047); --tc-idle: var(--disabled-text-color, #9e9e9e); --tc-accent: #2563eb;
          display: block; min-width: 0; --tc-natural-width: 360px; }
  /* A size container has no width of its own content: this empty grid gives the card a natural width without a minimum. */
  :host::before { content: ""; display: grid; grid-template-columns: minmax(0, var(--tc-natural-width)); height: 0; }
  ha-card { overflow: hidden; container-type: inline-size; }
  .icon { width: 18px; height: 18px; fill: currentColor; flex: none; }
  .clickable { cursor: pointer; }
  [role="button"]:focus-visible, button:focus-visible { outline: 2px solid var(--primary-color, var(--tc-accent)); outline-offset: 2px; border-radius: 6px; }
  /* Tint (--c, text and backgrounds) and fill (--disc) of each color; white is tinted grey to stay readable. */
  .c-blue { --c: var(--tc-blue); --disc: var(--tc-blue); }
  .c-white { --c: var(--tc-white-tint); --disc: var(--tc-white); }
  .c-red { --c: var(--tc-red); --disc: var(--tc-red); }
  .c-unknown { --c: var(--tc-idle); --disc: transparent; }
  .header { display: flex; align-items: center; gap: 10px; padding: 12px 12px 0; }
  .type-icon { position: relative; width: 40px; height: 40px; border-radius: 50%; display: flex; flex: none; align-items: center; justify-content: center;
               background: color-mix(in srgb, var(--c, var(--tc-accent)) 16%, transparent); transition: background-color .3s ease; }
  .type-icon .icon { width: 24px; height: 24px; fill: color-mix(in srgb, var(--c, var(--tc-accent)) 70%, var(--primary-text-color)); }
  .titles { flex: 1 1 0; min-width: 5ch; }
  :host([hide-title]) .titles > .name, :host([hide-subtitle]) .titles > .sub { display: none; }
  .name { font-size: 16px; font-weight: 500; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chip { display: inline-flex; align-items: center; gap: 4px; padding: 1px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; white-space: nowrap;
          align-self: flex-start; margin-top: 2px; background: color-mix(in srgb, var(--c) 15%, transparent);
          color: color-mix(in srgb, var(--c) 55%, var(--primary-text-color)); flex: 0 1 auto; min-width: 0; max-width: 50%; overflow: hidden; box-sizing: border-box; }
  .chip .icon { width: 14px; height: 14px; fill: var(--c); }
  .chip-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .warning { padding: 16px; color: var(--secondary-text-color); }
  .disc { position: relative; flex: none; width: 44px; height: 44px; border-radius: 50%; background: var(--disc); box-sizing: border-box;
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 35%, transparent); }
  .c-white .disc { box-shadow: inset 0 0 0 1px rgba(0,0,0,.18); }
  .c-unknown .disc { border: 2px dashed color-mix(in srgb, var(--c) 70%, transparent); box-shadow: none; }
  /* Animations: the day being lived only (blue ripple, white shimmer, red pulse), and tomorrow while not yet known. */
  .disc .ring { position: absolute; inset: 0; border-radius: 50%; pointer-events: none; }
  .live.c-blue .disc .ring { border: 2px solid var(--tc-blue); animation: tc-ripple 2.4s ease-out infinite; }
  .live.c-white .disc { overflow: hidden; }
  .live.c-white .disc .ring { background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.95) 50%, rgba(160,175,190,.35) 56%, transparent 70%);
                              background-size: 250% 100%; animation: tc-shimmer 2.4s ease-in-out infinite; }
  .live.c-red .disc { animation: tc-pulse 1.2s ease-in-out infinite; }
  .live.c-red .disc .ring { border: 2px solid var(--tc-red); animation: tc-ripple 1.2s ease-out infinite; }
  .c-unknown .disc.pending { animation: tc-spin 4.8s linear infinite; }
  @keyframes tc-ripple { from { transform: scale(1); opacity: .7; } to { transform: scale(1.6); opacity: 0; } }
  @keyframes tc-shimmer { from { background-position: 120% 0; } to { background-position: -120% 0; } }
  @keyframes tc-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--tc-red) 45%, transparent); }
                        50% { box-shadow: 0 0 0 7px color-mix(in srgb, var(--tc-red) 0%, transparent); } }
  @keyframes tc-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }
  .bar { height: 6px; border-radius: 3px; background: var(--divider-color, rgba(127,127,127,.25)); overflow: hidden; }
  .bar > div { height: 100%; border-radius: 3px; background: var(--c, var(--tc-accent)); }
  .c-white .bar > div { background: color-mix(in srgb, var(--tc-white-tint) 70%, var(--tc-white)); }
  .zoom { all: unset; flex: none; cursor: pointer; width: 24px; height: 24px; margin: -4px -4px -4px 0; border-radius: 50%;
          display: grid; place-items: center; color: var(--secondary-text-color); }
  .zoom .icon { width: 16px; height: 16px; }
  .zoom:hover { background: color-mix(in srgb, var(--tc-idle) 16%, transparent); color: var(--primary-text-color); }
  @container (max-width: 330px) {
    .sub-k { display: none; }
  }
  @container (max-width: 230px) {
    .chip { padding: 4px; flex: none; }
    .chip-text { display: none; }
    .header { gap: 6px; }
  }
`;

const FULL_STYLE = `
  .content { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 12px; }
  .hero { display: flex; gap: 12px; align-items: center; }
  .picture { flex: none; width: 132px; height: 110px; }
  .days { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
  .day { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px; min-width: 0;
         background: color-mix(in srgb, var(--c) 10%, transparent); }
  .day .disc { width: 36px; height: 36px; }
  .day.live .disc { width: 40px; height: 40px; }
  .day-text { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .day-text .k { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--secondary-text-color); }
  .day-text .v { font-size: 16px; font-weight: 500; color: color-mix(in srgb, var(--c) 55%, var(--primary-text-color)); }
  .day-text .k, .day-text .v, .day-text .date { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .day-text .date { font-size: 12px; color: var(--secondary-text-color); }
  .section-title { all: unset; box-sizing: border-box; width: 100%; display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500;
                   text-transform: uppercase; letter-spacing: .04em; color: var(--secondary-text-color); cursor: pointer; user-select: none; }
  .section-title .icon { width: 16px; height: 16px; }
  .section-title span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .section-title .chevron { margin-left: auto; transition: transform .2s ease; }
  .section-title[aria-expanded="false"] .chevron { transform: rotate(-90deg); }
  .section-body { margin-top: 8px; display: flex; flex-direction: column; gap: 8px; }
  .period-line { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; font-size: 13px; }
  .period-line .p { font-size: 15px; font-weight: 500; color: color-mix(in srgb, var(--c) 55%, var(--primary-text-color)); }
  .period-line .muted, .muted { color: var(--secondary-text-color); }
  .period-line .end { margin-left: auto; color: var(--secondary-text-color); }
  .tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .tile { display: flex; flex-direction: column; gap: 2px; padding: 6px 10px; border-radius: 10px; min-width: 0;
          background: var(--secondary-background-color, rgba(127,127,127,.08)); }
  .tile .k { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; }
  .tile .k span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .tile .v { font-size: 15px; font-weight: 500; line-height: 1.3; overflow-wrap: anywhere; }
  .tile .s { font-size: 11px; color: var(--secondary-text-color); }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--disc); flex: none; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 45%, transparent); }
  .rows { display: grid; grid-template-columns: 10px minmax(0, 1fr) minmax(70px, 1.3fr) auto; align-items: center; gap: 6px 8px; font-size: 12px; }
  .rows .lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rows .v { text-align: right; font-weight: 500; white-space: nowrap; }
  .rows.cost { grid-template-columns: 10px minmax(0, 1fr) auto auto; }
  .rows.cost .kwh { text-align: right; color: var(--secondary-text-color); white-space: nowrap; }
  @container (max-width: 230px) {
    .picture { display: none; }
  }
  @container (max-width: 330px) {
    .picture { width: 84px; height: 70px; }
    .hero { gap: 8px; }
    .rows { grid-template-columns: 10px minmax(0, 1fr) auto; }
    .rows .bar { display: none; }
  }
`;

const MINI_STYLE = `
  :host { --tc-natural-width: 300px; }
  .content { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 8px; }
  .pills { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .pill { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 22px; min-width: 0;
          background: color-mix(in srgb, var(--c) 10%, transparent); }
  .pill .disc { width: 28px; height: 28px; }
  .pill .txt { display: flex; flex-direction: column; min-width: 0; }
  .pill .k { font-size: 11px; color: var(--secondary-text-color); }
  .pill .v { font-size: 13px; font-weight: 500; color: color-mix(in srgb, var(--c) 55%, var(--primary-text-color)); }
  .pill .k, .pill .v { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .line { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--secondary-text-color); min-width: 0; }
  .line .icon { width: 16px; height: 16px; fill: var(--c); }
  .line span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  @container (max-width: 220px) {
    .pills { grid-template-columns: minmax(0, 1fr); }
  }
`;

// The hero picture: a pylon feeding a house, under the sky of the period (the sun turns its rays at peak hours, the
// moon shines among twinkling stars off-peak). The current flows along the line, faster as the day gets dearer
// (blue, white, red); on a red day at peak hours a warning bolt flashes on the house. The roof takes the color of
// the day. prefers-reduced-motion keeps the scene still.
const SUN_RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const p = (k) => `${(13 * k * Math.cos(a)).toFixed(2)} ${(13 * k * Math.sin(a)).toFixed(2)}`;
  return `M${p(0.62)}L${p(0.92)}`;
}).join("");
const sceneSvg = (color, period) =>
  `<svg class="scene c-${color || "unknown"} p-${period}" viewBox="0 0 120 100" aria-hidden="true">` +
  (period === "hc"
    ? '<g class="sky night"><path class="moon" d="M100 4a12 12 0 1 0 10 19a10 10 0 1 1 -10 -19z"/>' +
      '<path class="star" d="M54 14l1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.4-2.5 1.4.6-2.8-2.1-1.9 2.8-.3z"/>' +
      '<path class="star s2" d="M70 6l.9 1.9 2 .2-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.2z"/>' +
      '<path class="star s3" d="M78 22l.9 1.9 2 .2-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.2z"/></g>'
    : `<g class="sky day" transform="translate(100 18)"><circle class="glow" r="14"/><path class="rays" d="${SUN_RAYS}"/><circle class="sun" r="7"/></g>`) +
  '<path class="ground" d="M4 93H116"/>' +
  '<g class="pylon"><path d="M28 30L19 93M28 30L37 93M21.5 78H34.5M23.5 60H32.5M25.5 44H30.5M21.5 78L32.5 60M34.5 78L23.5 60M23.5 60L30.5 44M32.5 60L25.5 44"/>' +
  '<path d="M17 36H39M20 48H36"/></g>' +
  '<path class="wire" d="M38 36Q62 58 84 52"/><path class="flow" d="M38 36Q62 58 84 52"/>' +
  '<g class="house"><path class="wall" d="M76 62V92H110V62"/><path class="roof" d="M71 64L93 44L115 64Z"/>' +
  '<rect class="window" x="81" y="69" width="9" height="9" rx="1"/><rect class="door" x="96" y="74" width="8" height="18" rx="1"/>' +
  '<path class="warn" d="M86 80l-4 7h3.5l-1.5 6 6-8h-3.6l2-5z"/></g></svg>';

const SCENE_STYLE = `
  .scene { width: 100%; height: 100%; overflow: visible; }
  .scene .ground { stroke: var(--divider-color, rgba(127,127,127,.3)); stroke-width: 1.5; stroke-linecap: round; }
  .scene .pylon path { fill: none; stroke: var(--secondary-text-color); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; opacity: .75; }
  .scene .wire { fill: none; stroke: var(--secondary-text-color); stroke-width: 1.2; opacity: .45; }
  .scene .flow { fill: none; stroke: var(--c); stroke-width: 2.4; stroke-linecap: round; stroke-dasharray: 3 9; animation: tc-flow 1.2s linear infinite; }
  .scene.c-white .flow { stroke: color-mix(in srgb, var(--tc-white-tint) 80%, var(--primary-text-color)); animation-duration: .8s; }
  .scene.c-red .flow { animation-duration: .4s; }
  .scene.p-hc .flow { animation-duration: 2.4s; }
  .scene.c-unknown .flow { animation: none; opacity: .4; }
  .scene .wall { fill: var(--card-background-color, #fff); stroke: var(--secondary-text-color); stroke-width: 1.6; stroke-linejoin: round; }
  .scene .roof { fill: var(--disc); stroke: color-mix(in srgb, var(--c) 70%, var(--primary-text-color)); stroke-width: 1.6; stroke-linejoin: round; }
  .scene .window { fill: color-mix(in srgb, var(--secondary-text-color) 30%, transparent); }
  .scene.p-hc .window { fill: #ffd54f; animation: tc-glow 2.4s ease-in-out infinite; }
  .scene .door { fill: color-mix(in srgb, var(--secondary-text-color) 45%, transparent); }
  .scene .warn { display: none; }
  .scene.c-red.p-hp .warn { display: inline; fill: var(--tc-red); stroke: var(--card-background-color, #fff); stroke-width: .6;
                             transform-box: fill-box; transform-origin: center; animation: tc-alert 1.2s ease-in-out infinite; }
  .scene .sun { fill: #ffb300; }
  .scene .glow { fill: #ffca28; opacity: .25; transform-box: fill-box; transform-origin: center; animation: tc-breathe 2.4s ease-in-out infinite; }
  .scene .rays { stroke: #ffb300; stroke-width: 2; stroke-linecap: round; transform-box: fill-box; transform-origin: center; animation: tc-spin 9.6s linear infinite; }
  .scene .moon { fill: #ffe082; stroke: #f9a825; stroke-width: .8; }
  .scene .star { fill: #ffe082; transform-box: fill-box; transform-origin: center; animation: tc-twinkle 2.4s ease-in-out infinite; }
  .scene .star.s2 { animation-delay: -.8s; } .scene .star.s3 { animation-delay: -1.6s; }
  @keyframes tc-flow { to { stroke-dashoffset: -24; } }
  @keyframes tc-glow { 0%, 100% { opacity: .65; } 50% { opacity: 1; } }
  @keyframes tc-alert { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .35; transform: scale(.82); } }
  @keyframes tc-breathe { 0%, 100% { transform: scale(1); opacity: .25; } 50% { transform: scale(.82); opacity: .12; } }
  @keyframes tc-twinkle { 0%, 100% { opacity: .3; transform: scale(.65); } 50% { opacity: 1; transform: scale(1.1); } }
`;

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

// Elements a click acts on, and how one is told from the others across renders (focus kept by keyboard users).
const FOCUS_SELECTOR = "[data-action], [data-entity]";
const focusKey = (el) => {
  const data = Object.entries({ ...el.dataset });
  return data.length ? `${el.tagName}|${JSON.stringify(data)}` : "";
};
const DIALOG_TAGS = new Set(["HA-MORE-INFO-DIALOG", "HA-DIALOG", "DIALOG"]);
const isOutside = (card, ev) => {
  const path = ev.composedPath();
  return !path.includes(card) && !path.some((n) => DIALOG_TAGS.has(n.tagName));
};

// "A click elsewhere" is caught on the pointer, not only on the click event: on iOS (Safari and the companion app)
// a tap on something that is not clickable (the background, an empty spot, a card with no action) sends no click to
// the page. It counts when the press and the release are both outside the card (a slider dragged out of the card
// does not fold it), and a scroll does not count (the browser cancels the pointer). Keyboard clicks still go through
// the click event.
const watchOutside = (card, handler) => {
  let downOutside = false;
  const onDown = (ev) => {
    downOutside = isOutside(card, ev);
  };
  const onUp = (ev) => {
    if (downOutside && isOutside(card, ev)) handler(ev);
    downOutside = false;
  };
  const onClick = (ev) => {
    if (ev.detail === 0 && isOutside(card, ev)) handler(ev);
  };
  return {
    on() {
      document.addEventListener("pointerdown", onDown, true);
      document.addEventListener("pointerup", onUp, true);
      document.addEventListener("click", onClick, true);
    },
    // A tap (press and release at the same spot), for the tests.
    tap(ev) {
      onDown(ev);
      onUp(ev);
    },
    off() {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("click", onClick, true);
    },
  };
};

class TempoCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._html = "";
    this.shadowRoot.addEventListener("click", (ev) => this._onClick(ev));
    // Enter / Space on an element with the button role acts as a click, as on a <button>.
    this.shadowRoot.addEventListener("keydown", (ev) => {
      if ((ev.key !== "Enter" && ev.key !== " ") || ev.target?.getAttribute?.("role") !== "button") return;
      ev.preventDefault();
      ev.target.click();
    });
  }

  static getConfigElement() {
    return document.createElement("tempo-card-editor");
  }

  static getStubConfig() {
    return {};
  }

  getCardSize() {
    return 7;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this._config = { ...config };
    this.toggleAttribute?.("hide-title", config.show_title === false);
    this.toggleAttribute?.("hide-subtitle", config.show_subtitle === false);
    this._html = "";
    this._lastDeps = null;
    this._stats = null;
    this._update();
  }

  // Home Assistant pushes a new hass on every state change: the card is rebuilt only when what it shows changed.
  set hass(hass) {
    this._hass = hass;
    const deps = this._deps();
    const prev = this._lastDeps;
    if (deps && prev && deps.length === prev.length && deps.every((d, i) => d === prev[i])) return;
    this._lastDeps = deps;
    this._update();
  }

  get hass() {
    return this._hass;
  }

  _deps() {
    const h = this._hass;
    if (!h || !this._config) return null;
    const s = sourcesOf(h, this._config);
    const ids = Object.values(s).map((x) => x?.entity);
    // The minute: countdown, period and Tempo day move on their own.
    return [h.entities, h.language, h.locale, h.themes?.darkMode, h.config?.time_zone, Math.floor(this._now() / 60000), this._stats, ...ids.map((id) => id && h.states[id])];
  }

  connectedCallback() {
    // A click elsewhere on the page folds the sections back to their defaults.
    this._outside ??= watchOutside(this, () => {
      if (!this._toggled?.size) return;
      this._toggled = new Map();
      this._update();
    });
    this._outside.on();
    // Back on the page after leaving it: rendered again in its default state.
    if (this._hass && this._config) this._update();
    clearInterval(this._tick);
    this._tick = setInterval(() => {
      if (this._hass) this.hass = this._hass;
    }, 20000);
  }

  disconnectedCallback() {
    clearInterval(this._tick);
    this._tick = null;
    this._outside?.off();
    // Left (another dashboard view, a conditional card hidden): back to the defaults, so that the card does not
    // come back unfolded.
    this._toggled = new Map();
  }

  _now() {
    return Date.now();
  }

  _tz() {
    return this._hass?.config?.time_zone || DEFAULT_TZ;
  }

  _t(key, vars) {
    return t(this._hass, this._config, key, vars);
  }

  _locale() {
    return intlLocale(this._hass, this._config);
  }

  _update() {
    if (!this._hass || !this._config) return;
    const html = this._render();
    if (html === this._html) return;
    const kept = this._focusedSpot();
    this._html = html;
    this.shadowRoot.innerHTML = html;
    if (kept) this._focusables(kept.key)[kept.index]?.focus({ preventScroll: true });
  }

  _focusedSpot() {
    const el = this.shadowRoot.activeElement;
    if (!el?.dataset) return null;
    const key = focusKey(el);
    const index = key ? this._focusables(key).indexOf(el) : -1;
    return index < 0 ? null : { key, index };
  }

  _focusables(key) {
    return [...this.shadowRoot.querySelectorAll(FOCUS_SELECTOR)].filter((n) => focusKey(n) === key);
  }

  _onClick(ev) {
    const el = ev.composedPath().find((n) => n.dataset && (n.dataset.entity || n.dataset.action));
    if (!el) return;
    ev.stopPropagation();
    const { action, entity } = el.dataset;
    if (action === "zoom") return this._toggleZoom(ev);
    if (action === "toggle_section") {
      const key = el.dataset.section;
      this._toggled = new Map(this._toggled).set(key, !this._isCollapsed(key));
      return this._update();
    }
    if (entity) this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: entity }, bubbles: true, composed: true }));
  }

  _toggleZoom() {}

  _isCollapsed(key) {
    if (this._toggled?.has(key)) return this._toggled.get(key);
    const c = this._config.collapsed ?? [];
    return (Array.isArray(c) ? c : [c]).includes(key);
  }

  // Everything the cards show, read once per render.
  _model() {
    const h = this._hass;
    const c = this._config;
    const tz = this._tz();
    const now = this._now();
    const day = tempoDay(now, tz);
    // Sources of calendar days (Tarif EDF) read the day before until 06:00, when the Tempo day changes.
    const beforeSix = (({ h: hh, mi }) => hh * 60 + mi < DAY_START_MIN)(wall(now, tz));
    const s = { ...sourcesOf(h, c) };
    for (const key of ["today", "tomorrow"]) if (s[key] && "early" in s[key] && beforeSix) s[key] = s[key].early;
    const read = (key) => readSrc(h, s[key]);
    const today = colorOf(read("today"));
    const tomorrow = colorOf(read("tomorrow"));
    const computed = periodAt(now, tz, parseRanges(c.offpeak_hours));
    const reported = periodOf(read("period"));
    const period = reported || computed.period;
    // The bounds come from the off-peak hours; when the entity disagrees with them, the countdown follows the
    // integration's own next change time if it has one (RTE Tempo), otherwise none is shown.
    let { start, end } = computed;
    if (period !== computed.period) {
      const change = Date.parse(read("change"));
      start = null;
      end = Number.isFinite(change) && change > now ? change : null;
    }
    // The next period belongs to the next Tempo day when the change is at 06:00: tomorrow's color then.
    const nextDay = end ? tempoDay(end + 60000, tz) : day;
    const sameDay = nextDay.d === day.d && nextDay.mo === day.mo;
    const nextColor = sameDay ? today : tomorrow;
    const price = (color, p) => (color ? priceOf(h, s[`price_${color}_${p}`], `${color}_${p}`) : null);
    return {
      s,
      tz,
      now,
      day,
      today,
      tomorrow,
      period,
      start,
      end,
      next: period === "hc" ? "hp" : "hc",
      nextColor,
      price: price(today, period),
      nextPrice: price(nextColor, period === "hc" ? "hp" : "hc"),
      priceOf: price,
      season: seasonOf(day),
      currency: c.currency || "EUR",
    };
  }

  _render() {
    const m = this._model();
    if (!m.s.today && !m.s.tomorrow && !this._config.today_entity) return `<style>${BASE_STYLE}</style><ha-card><div class="warning">${esc(this._t("no_entity"))}</div></ha-card>`;
    const c = this._config;
    const parts = [this._days(m)];
    if (c.show_period !== false) parts.push(this._periodSection(m));
    if (c.show_season !== false) parts.push(this._seasonSection(m));
    if (c.show_cost !== false) parts.push(this._costSection(m));
    return `<style>${BASE_STYLE}${FULL_STYLE}${SCENE_STYLE}</style>
      <ha-card>
        ${this._header(m)}
        <div class="content">${parts.filter(Boolean).join("")}</div>
      </ha-card>`;
  }

  _colorName(color, suffix = "_day") {
    return this._t(color ? `${color}${suffix}` : "unknown_day");
  }

  _periodName(p) {
    return this._t(p === "hc" ? "offpeak" : "peak");
  }

  _header(m) {
    const c = this._config;
    const cls = `c-${m.today || "unknown"}`;
    // On a narrow card the label gives way to the price itself.
    const sub = m.price !== null ? `<span class="sub-k">${esc(this._t("current_price"))} · </span>${esc(fmtMoney(m.price, m.currency, this._locale(), 4))}/kWh` : "";
    const chipLabel = this._periodName(m.period);
    const chipEntity = m.s.period?.entity;
    const chipAttrs = chipEntity ? ` clickable" role="button" tabindex="0" data-entity="${esc(chipEntity)}` : "";
    return `
      <div class="header">
        <div class="type-icon ${cls}">${svgIcon(ICONS.bolt)}</div>
        <div class="titles">
          <div class="name">${esc(c.title || this._t("card_title"))}</div>
          ${sub ? `<div class="sub">${sub}</div>` : ""}
        </div>
        <span class="chip ${cls}${chipAttrs}" title="${esc(chipLabel)}" aria-label="${esc(chipLabel)}">${svgIcon(m.period === "hc" ? ICONS.night : ICONS.sun)}<span class="chip-text">${esc(chipLabel)}</span></span>
        ${this._zoomButton()}
      </div>`;
  }

  _zoomButton() {
    return "";
  }

  // A disc of a day's color; `live` animates it (the day being lived), an unknown tomorrow turns while it waits.
  _disc(color) {
    return `<div class="disc${color ? "" : " pending"}"><span class="ring"></span></div>`;
  }

  _dayAttrs(key, m, color, base) {
    const entity = m.s[key]?.entity;
    const name = `${this._t(key)}: ${this._colorName(color)}`;
    const live = key === "today" && color ? " live" : "";
    return `class="${base} c-${color || "unknown"}${live}${entity ? ` clickable" role="button" tabindex="0" data-entity="${esc(entity)}` : ""}" aria-label="${esc(name)}"`;
  }

  _days(m) {
    const locale = this._locale();
    const tile = (key, color, day) =>
      `<div ${this._dayAttrs(key, m, color, "day")}>${this._disc(color)}<div class="day-text"><div class="k">${esc(this._t(key))}</div><div class="v">${esc(
        this._colorName(color),
      )}</div><div class="date">${esc(fmtDate(day, locale))}</div></div></div>`;
    return `<div class="hero"><div class="picture">${sceneSvg(m.today, m.period)}</div><div class="days">${tile("today", m.today, m.day)}${tile(
      "tomorrow",
      m.tomorrow,
      addDays(m.day, 1),
    )}</div></div>`;
  }

  _sectionTitle(key, icon, label) {
    const closed = this._isCollapsed(key);
    return `<div class="section-title" role="button" tabindex="0" data-action="toggle_section" data-section="${key}" aria-expanded="${!closed}">${svgIcon(icon)}<span>${esc(
      label,
    )}</span>${svgIcon(ICONS.chevron_down, "chevron")}</div>`;
  }

  _section(key, icon, label, body) {
    if (!body) return "";
    return `<div class="section">${this._sectionTitle(key, icon, label)}${this._isCollapsed(key) ? "" : `<div class="section-body">${body}</div>`}</div>`;
  }

  _periodSection(m) {
    const locale = this._locale();
    const cls = `c-${m.today || "unknown"}`;
    const range = m.start && m.end ? `${fmtTime(m.start, m.tz, locale)} – ${fmtTime(m.end, m.tz, locale)}` : "";
    const pct = m.start && m.end ? Math.round(((m.now - m.start) / (m.end - m.start)) * 100) : null;
    const entity = m.s.period?.entity;
    const line = `<div class="period-line ${cls}${entity ? ` clickable" role="button" tabindex="0" data-entity="${esc(entity)}` : ""}"><span class="p">${esc(
      this._periodName(m.period),
    )}</span><span class="muted">${esc(range)}</span>${m.end ? `<span class="end">${esc(this._t("ends_in", { time: fmtDuration(m.end - m.now, locale) }))}</span>` : ""}</div>`;
    const bar = pct === null ? "" : `<div class="bar ${cls}"><div style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>`;
    const tile = (k, v, s, dotColor) =>
      `<div class="tile"><div class="k">${dotColor !== undefined ? `<span class="dot c-${dotColor || "unknown"}"></span>` : ""}<span>${esc(k)}</span></div><div class="v">${esc(v)}</div>${
        s ? `<div class="s">${esc(s)}</div>` : ""
      }</div>`;
    const priceText = (p) => (p === null ? "—" : `${fmtMoney(p, m.currency, locale, 4)}/kWh`);
    const tiles = `<div class="tiles">${tile(this._t("current_price"), priceText(m.price), `${this._colorName(m.today, "")} · ${this._t(m.period === "hc" ? "offpeak_short" : "peak_short")}`, m.today)}${tile(
      this._t("then_period", { period: this._periodName(m.next) }),
      priceText(m.nextPrice),
      m.end ? fmtTime(m.end, m.tz, locale) : "",
      m.nextColor,
    )}</div>`;
    return this._section("period", m.period === "hc" ? ICONS.night : ICONS.sun, this._t("show_period"), line + bar + tiles);
  }

  _seasonSection(m) {
    const h = this._hass;
    const locale = this._locale();
    const rows = [];
    for (const color of COLORS) {
      const s = m.s[`days_left_${color}`];
      const left = num(readSrc(h, s));
      if (left === null) continue;
      const total = seasonTotal(color, m.season);
      const pct = Math.round((left / total) * 100);
      rows.push(
        `<span class="dot c-${color}"></span><span class="lbl clickable" role="button" tabindex="0" data-entity="${esc(s.entity)}">${esc(this._t(color))}</span><div class="bar c-${color}"><div style="width:${Math.max(
          0,
          Math.min(100, pct),
        )}%"></div></div><span class="v">${esc(this._t("days_left", { left: fmtNum(left, 0, locale), total: fmtNum(total, 0, locale) }))}</span>`,
      );
    }
    if (!rows.length) return "";
    const label = this._t("season", { season: `${m.season.y}–${m.season.y + 1}` });
    return this._section("season", ICONS.calendar, label, `<div class="rows">${rows.join("")}</div>`);
  }

  // Energy of today and of the month per index, from the long-term statistics (hourly "change" of each index,
  // summed by day): { <index key>: { day, month } } in kWh, null until loaded.
  _energy(m) {
    const ids = INDEX_KEYS.map((k) => m.s[k]?.entity).filter(Boolean);
    if (!ids.length) return null;
    const monthStart = epochOf(m.tz, wall(m.now, m.tz).y, wall(m.now, m.tz).mo, 1);
    const key = `${ids.join(",")}|${monthStart}`;
    const fresh = this._stats && this._stats.key === key && m.now - this._stats.at < STATS_TTL;
    if (!fresh && !this._statsLoading) this._loadStats(ids, key, monthStart, m.now);
    if (!this._stats || this._stats.key !== key) return null;
    const w = wall(m.now, m.tz);
    const dayStart = epochOf(m.tz, w.y, w.mo, w.d);
    const out = {};
    for (const k of INDEX_KEYS) {
      const id = m.s[k]?.entity;
      const rows = (id && this._stats.data[id]) || [];
      let day = 0;
      let month = 0;
      for (const r of rows) {
        const change = num(r.change) ?? 0;
        const start = typeof r.start === "number" ? r.start : Date.parse(r.start);
        month += change;
        if (start >= dayStart) day += change;
      }
      if (id) out[k] = { day, month };
    }
    return out;
  }

  _loadStats(ids, key, monthStart, now) {
    if (typeof this._hass.callWS !== "function") return;
    this._statsLoading = true;
    Promise.resolve(
      this._hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: new Date(monthStart).toISOString(),
        end_time: new Date(now + 3600000).toISOString(),
        statistic_ids: ids,
        period: "day",
        types: ["change"],
        // Home Assistant converts Wh / MWh indexes.
        units: { energy: "kWh" },
      }),
    )
      .then(
        (data) => {
          this._stats = { key, at: now, data: data || {} };
        },
        () => {
          this._stats = { key, at: now, data: {} };
        },
      )
      .finally(() => {
        this._statsLoading = false;
        this._update();
      });
  }

  _costSection(m) {
    const energy = this._energy(m);
    if (energy === null && !INDEX_KEYS.some((k) => m.s[k])) return "";
    const locale = this._locale();
    const cur = m.currency;
    const sub = num(this._config.subscription);
    const w = wall(m.now, m.tz);
    const daysInMonth = new Date(Date.UTC(w.y, w.mo, 0)).getUTCDate();
    let dayCost = sub ? sub / daysInMonth : 0;
    let monthCost = sub || 0;
    let dayKwh = 0;
    let monthKwh = 0;
    const rows = [];
    for (const key of INDEX_KEYS) {
      const e = energy?.[key];
      if (!e) continue;
      const [color, p] = key.split("_");
      const price = m.priceOf(color, p) ?? 0;
      dayCost += e.day * price;
      monthCost += e.month * price;
      dayKwh += e.day;
      monthKwh += e.month;
      rows.push(
        `<span class="dot c-${color}"></span><span class="lbl clickable" role="button" tabindex="0" data-entity="${esc(m.s[key].entity)}">${esc(
          `${this._t(color)} · ${this._t(p === "hc" ? "offpeak_short" : "peak_short")}`,
        )}</span><span class="kwh">${esc(`${fmtNum(e.month, 1, locale)} kWh`)}</span><span class="v">${esc(fmtMoney(e.month * price, cur, locale))}</span>`,
      );
    }
    const loading = energy === null;
    const kwh = (v) => (loading ? "" : `${fmtNum(v, 1, locale)} kWh`);
    const tile = (k, v, s) => `<div class="tile"><div class="k"><span>${esc(k)}</span></div><div class="v">${esc(loading ? "…" : v)}</div><div class="s">${esc(s)}</div></div>`;
    const subNote = sub ? ` · ${this._t("subscription_incl")}` : "";
    const body = `<div class="tiles">${tile(this._t("today"), fmtMoney(dayCost, cur, locale), kwh(dayKwh))}${tile(this._t("this_month"), fmtMoney(monthCost, cur, locale), `${kwh(monthKwh)}${loading ? "" : subNote}`)}</div>${
      rows.length ? `<div class="rows cost">${rows.join("")}</div>` : ""
    }`;
    return this._section("cost", ICONS.euro, this._t("cost"), body);
  }
}

// The mini card is a full card drawn compact: its detail button (top right, `zoom: false` removes it) switches it
// to the full card's content and back, and a click anywhere else on the page brings the compact view back.
class TempoMiniCard extends TempoCard {
  constructor() {
    super();
    this._unzoom = watchOutside(this, () => {
      if (this._zoomed) this._setZoom(false);
    });
  }

  static getConfigElement() {
    return document.createElement("tempo-mini-card-editor");
  }

  connectedCallback() {
    super.connectedCallback();
    this._unzoom.on();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unzoom.off();
    // Back to the compact view once off the screen.
    this._zoomed = false;
  }

  getCardSize() {
    return this._zoomed ? super.getCardSize() : 3;
  }

  getGridOptions() {
    return { ...(this._zoomed ? super.getGridOptions() : { columns: 6, min_columns: 3 }), rows: "auto" };
  }

  _zoomButton() {
    if (this._config.zoom === false) return "";
    const z = this._zoomed;
    const label = esc(this._t(z ? "zoom_out" : "zoom_in"));
    return `<button class="zoom" data-action="zoom" title="${label}" aria-label="${label}">${svgIcon(z ? ICONS.collapse : ICONS.expand)}</button>`;
  }

  _setZoom(on) {
    this._zoomed = on;
    this._update();
    // getCardSize()/getGridOptions() changed: the view re-measures the card.
    this.dispatchEvent(new CustomEvent("iron-resize", { bubbles: true, composed: true }));
  }

  _toggleZoom(ev) {
    this._setZoom(!this._zoomed);
    if (ev.detail === 0) this.shadowRoot.querySelector(".zoom")?.focus({ preventScroll: true });
  }

  _render() {
    if (this._zoomed) return super._render();
    const m = this._model();
    if (!m.s.today && !m.s.tomorrow && !this._config.today_entity) return super._render();
    const pill = (key, color) =>
      `<div ${this._dayAttrs(key, m, color, "pill")}>${this._disc(color)}<div class="txt"><span class="k">${esc(this._t(key))}</span><span class="v">${esc(
        this._colorName(color, ""),
      )}</span></div></div>`;
    const locale = this._locale();
    const line = m.end ? `<div class="line c-${m.today || "unknown"}">${svgIcon(m.period === "hc" ? ICONS.night : ICONS.sun)}<span>${esc(
      `${this._periodName(m.period)} · ${this._t("ends_in", { time: fmtDuration(m.end - m.now, locale) })}`,
    )}</span></div>` : "";
    return `<style>${BASE_STYLE}${MINI_STYLE}</style>
      <ha-card>
        ${this._header(m)}
        <div class="content"><div class="pills">${pill("today", m.today)}${pill("tomorrow", m.tomorrow)}</div>${line}</div>
      </ha-card>`;
  }
}

// ---------------------------------------------------------------------------
// Visual editors (ha-form)
// ---------------------------------------------------------------------------

const DEFAULTS = { show_title: true, show_subtitle: true, show_period: true, show_season: true, show_cost: true, zoom: true, collapsed: [] };

class TempoCardEditor extends HTMLElement {
  static get toggles() {
    return ["show_title", "show_subtitle", "show_period", "show_season", "show_cost"];
  }

  static get full() {
    return true;
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _label(name) {
    const [color, p] = name.split("_");
    if (INDEX_KEYS.includes(name)) return `${t(this._hass, this._config, color)} · ${t(this._hass, this._config, p === "hc" ? "offpeak_short" : "peak_short")}`;
    return t(this._hass, this._config, name);
  }

  _schema() {
    const tr = (k) => t(this._hass, this._config, k);
    const sensor = { entity: { domain: ["sensor", "binary_sensor"] } };
    const expandable = (name, icon, schema) => ({ type: "expandable", name, title: tr(name), icon, schema });
    const full = this.constructor.full;
    return [
      { name: "title", selector: { text: {} } },
      { name: "today_entity", selector: { entity: { domain: "sensor" } } },
      { name: "tomorrow_entity", selector: { entity: { domain: "sensor" } } },
      { name: "offpeak_entity", selector: sensor },
      { name: "offpeak_hours", selector: { text: {} } },
      { type: "grid", name: "", schema: this.constructor.toggles.map((name) => ({ name, selector: { boolean: {} } })) },
      ...(full
        ? [
            {
              name: "collapsed",
              selector: { select: { multiple: true, mode: "list", options: SECTIONS.map((value) => ({ value, label: tr(`show_${value}`) })) } },
            },
          ]
        : []),
      expandable(
        "indexes",
        "mdi:counter",
        INDEX_KEYS.map((name) => ({ name, selector: { entity: { domain: "sensor" } } })),
      ),
      expandable("prices", "mdi:currency-eur", [
        ...INDEX_KEYS.map((name) => ({ name, selector: { number: { min: 0, step: 0.0001, mode: "box", unit_of_measurement: "/kWh" } } })),
      ]),
      { name: "subscription", selector: { number: { min: 0, step: 0.01, mode: "box" } } },
      expandable(
        "days_left_entities",
        "mdi:calendar-range",
        COLORS.map((name) => ({ name, selector: { entity: { domain: "sensor" } } })),
      ),
      { name: "language", selector: { select: { mode: "dropdown", options: [{ value: "", label: tr("lang_auto") }, ...LANGUAGES.map(([value, label]) => ({ value, label }))] } } },
    ];
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => this._label(s.name);
      this._form.computeHelper = (s) => (s.name === "zoom" ? t(this._hass, this._config, "zoom_helper") : undefined);
      this._form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        // The form edits prices as numbers: a price entity set in YAML stays until its number is changed.
        const value = { ...ev.detail.value };
        const kept = Object.entries(this._config.prices || {}).filter(([k, v]) => typeof v === "string" && value.prices?.[k] === DEFAULT_PRICES[k]);
        if (kept.length) value.prices = { ...value.prices, ...Object.fromEntries(kept) };
        this._config = cleanConfig(value);
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    const data = { ...DEFAULTS, ...this._config };
    // The nested forms take an object; the YAML key of the days left is days_left.
    data.indexes = { ...data.indexes };
    data.prices = { ...DEFAULT_PRICES, ...Object.fromEntries(Object.entries(data.prices || {}).filter(([, v]) => typeof v === "number")) };
    data.days_left_entities = { ...data.days_left };
    delete data.days_left;
    this._form.hass = this._hass;
    if (this._dataFor !== this._config) {
      this._dataFor = this._config;
      this._form.data = data;
    }
    const l = lang(this._hass, this._config);
    if (this._schemaLang !== l) {
      this._schemaLang = l;
      this._form.schema = this._schema();
    }
  }
}

// Keeps the YAML minimal: no empty value, no option left at its default, prices only where they differ.
const cleanConfig = (value) => {
  const config = { ...value };
  if (config.days_left_entities) {
    config.days_left = config.days_left_entities;
    delete config.days_left_entities;
  }
  for (const [k, v] of Object.entries(config)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const o = { ...v };
      for (const [sk, sv] of Object.entries(o)) if (sv === "" || sv === undefined || sv === null || (k === "prices" && sv === DEFAULT_PRICES[sk])) delete o[sk];
      if (Object.keys(o).length) config[k] = o;
      else delete config[k];
    } else if (v === "" || v === undefined || v === null || (k in DEFAULTS && JSON.stringify(v) === JSON.stringify(DEFAULTS[k]))) delete config[k];
  }
  return config;
};

class TempoMiniCardEditor extends TempoCardEditor {
  static get toggles() {
    return ["show_title", "show_subtitle", "zoom"];
  }

  static get full() {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

const define = (name, cls) => {
  if (!customElements.get(name)) customElements.define(name, cls);
};
define("tempo-card", TempoCard);
define("tempo-mini-card", TempoMiniCard);
define("tempo-card-editor", TempoCardEditor);
define("tempo-mini-card-editor", TempoMiniCardEditor);

window.customCards = window.customCards || [];
for (const card of [
  {
    type: "tempo-card",
    name: "Tempo Card",
    description: "EDF Tempo: color of today and tomorrow, days left in the season, off-peak / peak countdown and estimated cost.",
  },
  {
    type: "tempo-mini-card",
    name: "Tempo Mini Card",
    description: "Compact EDF Tempo overview: colors of today and tomorrow and the current period.",
  },
]) {
  if (!window.customCards.some((c) => c.type === card.type))
    window.customCards.push({ ...card, preview: true, documentationURL: "https://github.com/juju35/ha-tempo-card" });
}

console.info(`%c TEMPO-CARD %c v${VERSION} `, "color: white; background: #2563eb; font-weight: 700;", "color: #2563eb; background: white; font-weight: 700;");

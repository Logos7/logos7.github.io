# Portfolio Logos7

Strona: https://logos7.github.io

## Dodawanie i edycja projektów

Edytuj `data/projects.json`. Jeden wpis tworzy kartę na liście oraz podstronę
`/projects/<id>/`. Kolejność wpisów jest kolejnością kart. Repozytorium jest
opcjonalne: ustaw `repository` na `null` albo pomiń to pole. Projekt bez repo
ma taką samą podstronę i galerię jak pozostałe, bez przycisku GitHub.

Obrazki umieszczaj w `assets/projects/<id>/`. Ścieżki zaczynają się od
`/assets/`. Miniatury galerii otwierają pełny obraz w nowej karcie.

Minimalny przykład wpisu dodawanego do tablicy `projects`:

```json
{
  "id": "stary-projekt",
  "name": "Mój starszy projekt",
  "category": "technology",
  "status": { "pl": "Archiwalny" },
  "description": { "pl": "Krótki opis na karcie projektu." },
  "repository": null,
  "cover": {
    "src": "/assets/projects/stary-projekt/okladka.png",
    "alt": { "pl": "Widok aplikacji" }
  },
  "tags": ["C#", "Grafika"],
  "sections": [
    {
      "title": { "pl": "O projekcie" },
      "paragraphs": [{ "pl": "Pełny opis, co zrobiłem i jak to działało." }],
      "items": []
    }
  ],
  "gallery": [
    {
      "src": "/assets/projects/stary-projekt/screen-01.png",
      "alt": { "pl": "Główne okno programu" },
      "caption": { "pl": "Pierwsza wersja interfejsu." }
    }
  ]
}
```

Teksty mogą być obiektami z kluczami `pl`, `en`, `de`, `es` albo zwykłymi
ciągami znaków. Nie musisz od razu tłumaczyć wszystkiego: brakujący język
korzysta z wersji angielskiej, potem polskiej, potem pierwszej dostępnej.
Zwykły ciąg znaków jest wspólny dla wszystkich języków. Teksty są zwykłym
tekstem, bez HTML.

Opcjonalne pola: `eyebrow`, `lead` (dłuższy opis w nagłówku),
`metaDescription`, `callout`, `notice`, `metadata` (tablica par
`label` / `value`) oraz `headingSplit` (pozycja początku kolorowego fragmentu
nazwy). Bez okładki wyświetla się abstrakcyjna grafika CSS. Pusta galeria
nie wyświetla sekcji Galeria. Stan projektu i obecność repozytorium są
niezależne — projekt archiwalny też może mieć publiczny kod.

Kategorie definiuje tablica `categories` w tym samym pliku. Pole `category`
projektu musi wskazywać identyfikator istniejącej kategorii. Filtry powstają
z tych danych automatycznie.

## Budowanie strony

Wymagany Node.js 18 lub nowszy. Brak dodatkowych bibliotek i `npm install`.

```sh
npm run build
npm run check
git add .
git commit -m "Update portfolio projects"
git push
```

Generator sprawdza unikalność identyfikatorów, kategorie, linki repozytoriów
i obecność plików graficznych. Tworzy gotowe pliki HTML, tłumaczenia projektów
i mapę strony. GitHub Pages nadal może publikować statyczne pliki z obecnej
gałęzi; nie wymaga serwera aplikacji ani zmiany sposobu hostowania.

Nie edytuj ręcznie `projects/index.html`, `projects/*/index.html`,
`assets/js/project-translations.js` ani `sitemap.xml` — powstają z katalogu.
Układ edytuj w `templates/`, wygląd w `assets/css/site.css`.

Przy usuwaniu projektu usuń jego wpis z katalogu i jego wygenerowany katalog
`projects/<id>/`, a następnie ponownie uruchom budowanie.

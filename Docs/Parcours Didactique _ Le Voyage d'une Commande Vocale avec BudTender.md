### Parcours Didactique : Le Voyage d'une Commande Vocale avec BudTender

#### 1\. Introduction : Rencontre avec Melina, le « Sommelier du Chanvre »

Dans l'écosystème du e-commerce traditionnel (Shopify, WooCommerce), l'expérience utilisateur est souvent freinée par ce que les architectes appellent le « Plugin Hell » : un empilement de couches logicielles tierces qui créent des silos de données et une latence frustrante.  **Green-mood**  brise ce paradigme avec une philosophie  **"AI-First"** .Ici, l'IA n'est pas un consultant externe appelé sur une ligne téléphonique instable ; elle est un citoyen natif de l'architecture. Cette intelligence est incarnée par  **Melina** , votre BudTender. Imaginez un sommelier d'élite qui fait partie intégrante de la maison. Elle ne se contente pas de lire une étiquette : elle connaît la cave sur le bout des doigts, se souvient de vos dégustations passées et maîtrise la science des sols. Melina transforme un processus d'achat rigide en une conversation fluide, capable de décoder vos besoins avec une précision chirurgicale.*Mais comment une simple vibration sonore se transforme-t-elle en une action transactionnelle complexe ? Suivons le voyage d'une intention, de l'air ambiant jusqu'au cœur du processeur.*

#### 2\. Étape 1 : La Capture de l'Intention (La Voix et l'Instinct)

Le voyage commence par la parole. Pour que l'échange soit naturel, la technologie doit se faire oublier. BudTender utilise le modèle  **models/gemini-2.0-flash-audio-latest**  via l'API Google Gemini Live.La prouesse réside dans une latence record de  **moins de 500ms** . Pour atteindre cette réactivité humaine, nous utilisons le protocole  **WebSocket** . Contrairement à un "talkie-walkie" (où l'on attend la fin de la phrase pour traiter l'info), le WebSocket agit comme un  **flux de pensée constant**  : l'IA commence à traiter l'ambiance et la structure de votre demande pendant que vous parlez encore.**Note Clé : Pourquoi le texte seul est une impasse**  Dans une architecture AI-First, la simple transcription (Speech-to-Text) ne suffit pas. L'IA doit "ressentir" l'intention. Melina capte les nuances, l'urgence ou l'hésitation. Une transcription brute verrait des mots ; Melina voit un besoin de soulagement ou une recherche de découverte, traitant la voix comme un vecteur d'intention multidimensionnel.*Une fois l'intention captée, l'IA doit traduire ces mots dans sa langue maternelle : la géométrie mathématique.*

#### 3\. Étape 2 : La Vectorisation et la Carte des Idées

Pour comprendre le sens profond d'une phrase, Melina projette votre demande sur une  **« carte géographique des idées »**  via le modèle  **text-embedding-3-large**  d'OpenRouter. Chaque concept est traduit en un vecteur de  **3072 dimensions** .Imaginez un espace immense où chaque point est une idée. Plus deux idées sont proches sémantiquement, plus leurs coordonnées mathématiques sont voisines, peu importe les mots utilisés.| Caractéristique | Recherche Classique (Mots-clés) | Recherche Vectorielle BudTender || \------ | \------ | \------ || **Méthode** | Correspondance exacte des lettres. | Compréhension de la "proximité" sémantique. || **Exemple de requête** | "Sommeil" | "J'ai passé une nuit difficile." || **Résultat BudTender** | Uniquement les produits contenant "sommeil". | **Insomnie → Myrcène → Fleurs apaisantes.** || **Profondeur** | Indexation textuelle superficielle. | **3072 dimensions**  via  **pgvector**  & HNSW. |  
*Une fois votre besoin situé précisément sur cette carte, Melina doit consulter ses grimoires pour garantir une réponse sans faille.*

#### 4\. Étape 3 : Le RAG – L'Examen à Livre Ouvert

Pour éviter les "hallucinations" (inventions de l'IA), BudTender utilise le protocole  **RAG (Retrieval-Augmented Generation)** . C'est l'équivalent d'un  **« examen à livre ouvert »**  : Melina ne répond pas de mémoire, elle va chercher l'information dans des sources certifiées avant de formuler sa phrase.Grâce à l'indexation  **HNSW**  (ultra-rapide, \<10ms), elle interroge trois réservoirs de données dans notre "Single Source of Truth" (Supabase) :

* **Réservoir Science & Botanique :**  Accès aux  **COAs (Certificats d'Analyse)**  et aux profils de  **terpènes** .  
* *Bénéfice :*  Garantie absolue de la conformité légale (taux de  **THC \< 0,3%** ) et expertise scientifique réelle.  
* **Catalogue Dynamique :**  État des stocks et prix en temps réel.  
* *Bénéfice :*  Melina ne propose jamais un produit en rupture de stock.  
* **Profil Utilisateur & Fidélité :**  Historique et solde de  **Carats** .  
* *Bénéfice :*  Personnalisation totale. Melina sait que  **1€ dépensé \= 10 Carats**  et peut vous dire si vos points couvrent votre achat.*Armée de ces faits indiscutables, Melina ne va pas seulement parler : elle va agir sur l'interface.*

#### 5\. Étape 4 : Le Moteur de Skills – De la Parole à l'Action

L'intelligence de Melina est pilotée par un  **Moteur de Skills**  unique. Son comportement, son ton et ses connaissances sont définis dans des fichiers  **Markdown**  (src/skills/\*.md). Cela permet de modifier son expertise botanique ou son discours commercial sans toucher à une seule ligne de code.Elle utilise ensuite ses  **"Action Tools"**  pour manipuler l'application. Pour garantir une fiabilité totale, nous appliquons une  **fenêtre de déduplication de 2500ms**  : si vous bégayez ou si le réseau vacille, l'IA ne validera jamais deux fois la même commande.Voici ses outils les plus puissants :

1. **add\_to\_cart**  **:**  Melina dépose instantanément le produit dans votre panier par simple commande vocale.  
2. **suggest\_bundle**  **:**  Elle analyse votre besoin et suggère une routine complète (ex: une huile CBD \+ une infusion relaxante).  
3. **search\_expert\_data**  **:**  Elle effectue une recherche profonde dans les guides PDF et les blogs experts pour répondre à une question technique complexe.*Ce cycle complet, de la voix à l'action, se déroule en une fraction de seconde, humanisant radicalement l'acte d'achat.*

#### Conclusion : L'IA qui Humanise le Commerce

Le voyage de BudTender démontre que la technologie, lorsqu'elle est native, n'est plus une barrière mais un pont. En combinant la puissance de Gemini Live, la précision de la recherche vectorielle et la rigueur du RAG, Green-mood offre une expérience où l'expertise scientifique rencontre la fluidité humaine.**Le Saviez-Vous ?**   **Pour garantir la sécurité de ce voyage, chaque transaction est "Atomique". Imaginez que deux clients achètent la dernière fleur disponible à la même milliseconde (une "Race Condition"). Grâce à la fonction PostgreSQL RPC**  **process\_checkout**  **, le système traite l'opération comme un bloc insécable : soit le paiement, la décrémentation du stock et l'attribution des Carats réussissent ensemble, soit tout est annulé. C'est la garantie d'une fiabilité absolue derrière la magie de l'IA.**  

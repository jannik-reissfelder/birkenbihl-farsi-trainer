
import React from 'react';
import { LightbulbIcon } from './icons/LightbulbIcon';

const rules = [
    {
        id: 1,
        title: "Transliterationspflicht (F-TKS)",
        description: "Die persisch-arabische Schrift muss konsequent in ein didaktisch vereinfachtes, leicht lesbares lateinisches Transliterationssystem umgewandelt werden, um die Leseflüssigkeit zu gewährleisten.",
        reason: "Dies verhindert, dass sich das Gehirn mit einer fremden Schrift (kognitive Belastung) statt mit dem Vokabular auseinandersetzen muss.",
        example: "Farsi (Schrift) → man ketāb râ xândam (F-TKS)"
    },
    {
        id: 2,
        title: "Strenges Token-Alignment (1:1)",
        description: "Jeder Farsi-Token (Wort oder Morphem) muss exakt durch ein deutsches Token repräsentiert werden, um die Wort-für-Wort-Gleichung zu bewahren.",
        reason: "Das Gehirn lernt durch konstanten Vergleich die Reihenfolge und das Gewicht jedes Wortes.",
        example: "Farsi-Satz (5 Tokens) → Deutscher Dekodier-Satz (5 Tokens)."
    },
    {
        id: 3,
        title: "Grammatik-Platzhalter für 'râ'",
        description: "Der postpositionale Akkusativ-Marker 'râ' (را), welcher eine grammatische Funktion, aber keinen semantischen Inhalt trägt, wird immer durch den konsistenten Platzhalter 'D.O.' (Direct Object) dekodiert.",
        reason: "Das 'D.O.' hält das Token-Alignment (Regel 2) aufrecht und markiert die Objekt-Funktion visuell.",
        example: "man ketāb râ xândam → Ich Buch D.O. las-ich."
    },
    {
        id: 4,
        title: "Differenzierte Ezafe-Dekodierung",
        description: "Das Ezafe-Bindeglied (-e/-ye) wird je nach Funktion unterschiedlich dekodiert: Bei Besitz (Nomen + Besitzer) wird es als Affix '-von' angehängt. Bei Adjektiven (Nomen + Adjektiv) wird es als '-der/-die/-das' dekodiert. Die Farsi-Wortreihenfolge wird beibehalten.",
        reason: "Dies lehrt die unterschiedlichen Funktionen des Ezafe und die Nomen-Modifikator-Struktur des Farsi (Kopf rechts), ohne Tokens zu vertauschen.",
        example: "Besitz: ketāb-e man → Buch-von mein. Adjektiv: pesar-e qashang → Junge-der schöne."
    },
    {
        id: 5,
        title: "Standardisierung geschlechtsneutraler Pronomen",
        description: "Das geschlechtsneutrale Pronomen 'u' (او) wird für die De-kodierung konsistent als 'er' übersetzt. Dies gilt auch für die 3. Person Singular-Endung am Verb, wenn kein explizites Subjekt vorhanden ist.",
        reason: "Dies vereinfacht die De-kodierung, vermeidet Verwirrung mit dem formellen 'Sie' und erinnert daran, dass das Farsi-Pronomen geschlechtsneutral ist.",
        example: "u raft → er ging."
    },
    {
        id: 6,
        title: "Split-Dekodierung komplexer Verben",
        description: "Farsi-Komplexverben (Nomen + Hilfsverb, z.B. kardan) werden in ihre zwei Tokens getrennt und wörtlich übersetzt. Niemals wird nur ein deutsches Wort verwendet.",
        reason: "Die Wort-für-Wort-Struktur muss erhalten bleiben, damit das Gehirn die zweigliedrige Natur der Verben lernt.",
        example: "kār kardan (arbeiten) → Arbeit machen."
    },
    {
        id: 7,
        title: "Ergänzung von Null-Subjekten",
        description: "Wenn Farsi das Subjekt weglässt (Pro-Drop) und es im Deutschen für das Verständnis zwingend notwendig ist, wird es in runden Klammern ergänzt. Dies ist die einzige Ausnahme zur Regel 2.",
        reason: "Dies sichert die Sinnhaftigkeit des deutschen Satzes (kognitive Entlastung), aber die Klammern zeigen die Abwesenheit im Farsi-Original.",
        example: "mi-rav-am (gehe-ich) → (Ich) gehe-ich."
    },
    {
        id: 8,
        title: "Affixale Suffix-Markierung",
        description: "Grammatische Suffixe (z.B. Pluralmarker '-hā' oder Konjugationsendungen) werden als standardisierte Marker mit einem Bindestrich angehängt.",
        reason: "Dies macht die Farsi-Morphologie sichtbar und transparent für das Gehirn.",
        example: "ketâb-hā (Bücher) → Buch-PL / mi-rav-am → gehe-ich."
    }
];

const Methodology: React.FC = () => {
    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="text-center mb-10">
                <LightbulbIcon className="h-16 w-16 mx-auto text-teal-400" />
                <h2 className="text-4xl font-bold mt-4 text-gray-100">Unsere Lernmethode</h2>
                <p className="text-lg text-gray-400 mt-2">Die 8 Regeln für eine konsistente und effektive De-kodierung.</p>
            </div>
            <div className="space-y-6">
                {rules.map(rule => (
                    <div key={rule.id} className="bg-gray-800 p-6 rounded-lg border border-gray-700 transition-all duration-300 hover:border-blue-500/50 hover:shadow-lg">
                        <h3 className="text-xl font-semibold text-blue-400 mb-3">Regel {rule.id}: {rule.title}</h3>
                        <p className="text-gray-300 mb-4">{rule.description}</p>
                        <div className="text-sm text-gray-400 bg-gray-900/50 p-3 rounded-md border-l-4 border-gray-600 mb-4">
                            <span className="font-bold text-gray-300">Didaktische Begründung:</span> {rule.reason}
                        </div>
                        <div className="text-sm text-teal-300 bg-teal-500/10 p-3 rounded-md">
                            <span className="font-bold">Beispiel:</span> <code className="font-mono">{rule.example}</code>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Methodology;

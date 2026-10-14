import React, { useState } from 'react';
import { 
  Mail, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Calendar, 
  MapPin, 
  Search, 
  RefreshCw, 
  Ban, 
  ChevronRight,
  BookOpen,
  Send,
  Eye,
  FastForward
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { DemandeAttente, EmailNotification, StatutDemande } from '../types';

export const QueueAndNotificationsView: React.FC = () => {
  const { 
    ouvrages, 
    adherents, 
    exemplaires, 
    demandes, 
    notifications, 
    annulerDemande, 
    checkExpiredReservations, 
    advanceOneDay,
    currentDate, 
    getOuvrageById, 
    getExemplaireById, 
    getAdherentById 
  } = useLibrary();

  const [activeSubTab, setActiveSubTab] = useState<'queues' | 'emails'>('queues');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<EmailNotification | null>(null);

  // Filtered requests
  const activeQueues = demandes.filter(d => d.statut === 'EN_ATTENTE' || d.statut === 'NOTIFIEE');
  const notifiedQueues = demandes.filter(d => d.statut === 'NOTIFIEE');

  // Group active queues by Ouvrage
  const ouvrageQueueMap = new Map<string, DemandeAttente[]>();
  demandes.forEach(d => {
    const list = ouvrageQueueMap.get(d.ouvrageId) || [];
    list.push(d);
    ouvrageQueueMap.set(d.ouvrageId, list);
  });

  // Sort within each book by dateInscription
  ouvrageQueueMap.forEach((list) => {
    list.sort((a, b) => a.dateInscription.localeCompare(b.dateInscription));
  });

  const filteredNotifications = notifications.filter(notif => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      notif.destinataireNom.toLowerCase().includes(q) ||
      notif.destinataireEmail.toLowerCase().includes(q) ||
      notif.destinataireNumero.toLowerCase().includes(q) ||
      notif.sujet.toLowerCase().includes(q) ||
      notif.ouvrageTitre.toLowerCase().includes(q)
    );
  });

  const handleManualCheckExpiration = () => {
    checkExpiredReservations();
  };

  const getStatusBadge = (statut: StatutDemande) => {
    switch (statut) {
      case 'EN_ATTENTE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            En attente de retour
          </span>
        );
      case 'NOTIFIEE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 animate-pulse">
            <Mail className="w-3 h-3 text-blue-600" />
            NOTIFIÉ (Délai 24h)
          </span>
        );
      case 'SERVIE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Servie (Emprunté)
          </span>
        );
      case 'EXPIREE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            <AlertTriangle className="w-3 h-3 text-slate-500" />
            Délai expiré (+24h)
          </span>
        );
      case 'ANNULEE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <Ban className="w-3 h-3 text-rose-500" />
            Annulée
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-serif text-slate-900">
              Files d'Attente & Journal des Notifications
            </h1>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full">
              Délai 24h
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Gestion prioritaire des réservations d'un jour et traçabilité des e-mails académiques envoyés aux étudiants.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={advanceOneDay}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 shadow-2xs transition"
            title="Avancer le temps d'1 jour calendaire (+24h) pour tester la file d'attente sans attendre"
          >
            <FastForward className="w-3.5 h-3.5 text-amber-700" />
            <span>Avancer d'1 jour (+24h)</span>
          </button>
          <button
            onClick={handleManualCheckExpiration}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition"
            title="Vérifie si des réservations de 24h sont arrivées à échéance pour passer au suivant"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Vérifier Expirations</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase">Demandes en attente</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{activeQueues.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Étudiants positionnés dans une file</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase">Réservations 24h Notifiées</span>
            <div className="text-2xl font-extrabold text-blue-700 mt-1">{notifiedQueues.length}</div>
            <div className="text-[11px] text-blue-600 font-medium mt-0.5">En cours de retrait par l'étudiant</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase">E-mails académiques consignés</span>
            <div className="text-2xl font-extrabold text-emerald-800 mt-1">{notifications.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Journal des messages envoyés</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Mail className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-2xl border shadow-xs">
        <button
          onClick={() => setActiveSubTab('queues')}
          className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeSubTab === 'queues'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Files d'Attente par Ouvrage ({activeQueues.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('emails')}
          className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeSubTab === 'emails'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Journal des Notifications E-mail ({notifications.length})</span>
        </button>
      </div>

      {/* Tab 1: Queues */}
      {activeSubTab === 'queues' && (
        <div className="space-y-4">
          {Array.from(ouvrageQueueMap.entries()).length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">Aucune file d'attente enregistrée</p>
              <p className="text-xs text-slate-400 mt-1">
                Les étudiants peuvent s'inscrire en file d'attente depuis l'espace de consultation quand tous les exemplaires sont empruntés.
              </p>
            </div>
          ) : (
            Array.from(ouvrageQueueMap.entries()).map(([ouvrageId, requestList]) => {
              const ow = getOuvrageById(ouvrageId);
              if (!ow) return null;

              const activeList = requestList.filter(d => d.statut === 'EN_ATTENTE' || d.statut === 'NOTIFIEE');

              return (
                <div key={ouvrageId} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  {/* Ouvrage header in card */}
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                          {ow.cote}
                        </span>
                        <h3 className="font-bold font-serif text-sm text-slate-900">{ow.titre}</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        par {ow.auteur} • {activeList.length} étudiant(s) en attente active
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-600">
                        File active : <strong>{activeList.length}</strong>
                      </span>
                    </div>
                  </div>

                  {/* List of queue entries */}
                  <div className="divide-y divide-slate-100">
                    {requestList.map((req, index) => {
                      const student = getAdherentById(req.adherentId);
                      const isNotified = req.statut === 'NOTIFIEE';
                      const ex = req.exemplaireReserveId ? getExemplaireById(req.exemplaireReserveId) : null;

                      // Active rank among pending/notified
                      const activeIndex = activeList.findIndex(d => d.id === req.id);
                      const displayRank = activeIndex !== -1 ? activeIndex + 1 : '-';

                      return (
                        <div key={req.id} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                          isNotified ? 'bg-blue-50/40' : ''
                        }`}>
                          <div className="flex items-center space-x-3">
                            {/* Rank badge */}
                            <div className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center shrink-0 ${
                              isNotified 
                                ? 'bg-blue-600 text-white shadow-xs' 
                                : activeIndex !== -1 
                                  ? 'bg-amber-100 text-amber-900' 
                                  : 'bg-slate-100 text-slate-400'
                            }`}>
                              {displayRank !== '-' ? `R${displayRank}` : '#'}
                            </div>

                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span>{student?.prenom} {student?.nom}</span>
                                <span className="font-mono text-[11px] text-slate-500 font-normal">({student?.numeroEtudiant})</span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3">
                                <span>E-mail : <strong className="text-slate-700">{student?.emailAcademique}</strong></span>
                                <span>Inscrit le : {new Date(req.dateInscription).toLocaleDateString('fr-FR')}</span>
                              </div>

                              {/* Notification details if notified */}
                              {isNotified && (
                                <div className="mt-1.5 p-2 rounded-lg bg-blue-100/70 border border-blue-200 text-blue-950 text-[11px] space-y-0.5">
                                  <div className="font-bold flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-blue-700" />
                                    <span>Exemplaire réservé : {ex?.codeQR} (Tiroir {ex?.emplacement.tiroir}, Rangée {ex?.emplacement.rangee})</span>
                                  </div>
                                  <div className="text-blue-800">
                                    Date limite de retrait (24h) : <strong>{req.dateLimiteRetrait ? new Date(req.dateLimiteRetrait).toLocaleDateString('fr-FR') : ''}</strong>
                                    {req.dateLimiteRetrait && req.dateLimiteRetrait <= currentDate && (
                                      <span className="ml-1 text-rose-700 font-bold">⚠️ Échéance atteinte</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {getStatusBadge(req.statut)}

                            {(req.statut === 'EN_ATTENTE' || req.statut === 'NOTIFIEE') && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Annuler la demande de file d'attente pour ${student?.prenom} ${student?.nom} ?`)) {
                                    annulerDemande(req.id);
                                  }
                                }}
                                className="px-2.5 py-1 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg font-bold text-[11px] transition"
                              >
                                Annuler
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Notifications Email Journal */}
      {activeSubTab === 'emails' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filtrer par étudiant, e-mail, ouvrage..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
              />
            </div>
            <span className="text-xs text-slate-500">{filteredNotifications.length} message(s) consigné(s)</span>
          </div>

          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              <Mail className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">Aucun e-mail consigné dans le journal</p>
              <p className="text-xs text-slate-400 mt-1">
                Les e-mails sont automatiquement envoyés à la notification d'une réservation (24h de retrait) ou aux rappels de retards.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map(notif => (
                <div 
                  key={notif.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-300 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{notif.sujet}</span>
                      <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-2 py-0.2 rounded border border-blue-200">
                        {notif.type}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-3">
                      <span>Destinataire : <strong>{notif.destinataireNom}</strong> ({notif.destinataireNumero})</span>
                      <span>E-mail : <strong className="text-blue-700">{notif.destinataireEmail}</strong></span>
                      <span>Envoyé le : {new Date(notif.dateEnvoi).toLocaleDateString('fr-FR')} {notif.heureEnvoi ? `à ${notif.heureEnvoi}` : ''}</span>
                    </div>

                    {notif.emplacement && (
                      <div className="text-[11px] text-amber-800 font-mono mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-600" />
                        <span>Rangement communiqué : Tiroir {notif.emplacement.tiroir}, Rangée {notif.emplacement.rangee}</span>
                        {notif.dateLimiteRetrait && (
                          <span className="ml-2 font-bold text-rose-700">• Date limite : {new Date(notif.dateLimiteRetrait).toLocaleDateString('fr-FR')}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedEmail(notif)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs flex items-center gap-1 transition"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      Voir le message
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Email Preview Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold font-serif">Courriel Académique Consigné</h3>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-sans">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">De :</span>
                  <strong className="text-slate-900">Bibliothèque Universitaire &lt;pret-bibliotheque@usmba.ac.ma&gt;</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">À :</span>
                  <strong className="text-blue-700">{selectedEmail.destinataireNom} &lt;{selectedEmail.destinataireEmail}&gt;</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date :</span>
                  <span className="text-slate-700">{new Date(selectedEmail.dateEnvoi).toLocaleDateString('fr-FR')} {selectedEmail.heureEnvoi || ''}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Objet :</span>
                  <strong className="text-slate-900">{selectedEmail.sujet}</strong>
                </div>
              </div>

              {/* Email Content Body */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 font-mono text-xs whitespace-pre-line text-slate-800 leading-relaxed shadow-inner">
                {selectedEmail.corps}
              </div>

              {selectedEmail.emplacement && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 font-mono flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Emplacement communiqué : Tiroir <strong>{selectedEmail.emplacement.tiroir}</strong>, Rangée <strong>{selectedEmail.emplacement.rangee}</strong></span>
                </div>
              )}
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setSelectedEmail(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export function createTryOn(fetchRequest = (...args) => fetch(...args)) {
  let pending = null;
  return {
    submit({ photo, resultKey, answers, consent }) {
      if (pending) return pending;
      if (!consent) return Promise.reject(new Error('Bitte bestätigen Sie die Bildverarbeitung.'));
      if (!photo) return Promise.reject(new Error('Bitte wählen Sie ein Foto aus.'));
      const zone = { content: 'brows', sales: 'lips', operations: 'eyeliner' }[resultKey];
      const effect = ['natural', 'balanced', 'expressive'][answers.input];
      const shade = ['light', 'medium', 'dark'][answers.shade];
      if (!zone || !effect || !shade) return Promise.reject(new Error('Bitte beantworten Sie zuerst die Fragen.'));
      const body = new FormData();
      body.set('photo', photo);
      body.set('zone', zone);
      body.set('effect', effect);
      body.set('shade', shade);
      body.set('consent', 'yes');
      pending = (async () => {
        try {
          const response = await fetchRequest('/api/try-on', { method: 'POST', body, signal: AbortSignal.timeout(180_000) });
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || 'Die Vorschau konnte nicht erstellt werden. Bitte versuchen Sie es erneut.');
          }
          const blob = await response.blob();
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type) || !blob.size) {
            throw new Error('Die Foto-Verarbeitung ist hier nicht verfügbar. Bitte öffnen Sie die lokale Testversion.');
          }
          return blob;
        } catch (error) {
          if (error.name === 'TimeoutError' || error instanceof TypeError) {
            throw new Error('Die Verbindung zur Foto-Verarbeitung wurde unterbrochen. Bitte versuchen Sie es erneut.');
          }
          throw error;
        } finally {
          pending = null;
        }
      })();
      return pending;
    },
  };
}

// Picks the data layer: Firebase normally, or the in-memory demo when config.demo is set.
// Both hand back the same store API plus a small session object.
export async function connect(config) {
  if (config.demo) return (await import('./demo.js')).createDemo(config.demo);
  const [{ initializeApp }, authSdk, firestore, { createStore }] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js'),
    import('./store.js'),
  ]);
  const app = initializeApp(config.firebase);
  const auth = authSdk.getAuth(app), db = firestore.getFirestore(app);
  if (config.emulators) { authSdk.connectAuthEmulator(auth, config.emulators.auth, { disableWarnings: true }); firestore.connectFirestoreEmulator(db, ...config.emulators.firestore); }
  return {
    store: createStore(db, firestore),
    session: {
      ready: () => auth.authStateReady(),
      user: () => auth.currentUser,
      signIn: async () => (await authSdk.signInAnonymously(auth)).user,
    },
  };
}

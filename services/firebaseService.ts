import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseAuthUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query as dbQuery, 
  where, 
  orderBy, 
  deleteDoc, 
  updateDoc, 
  limit, 
  addDoc,
  enableIndexedDbPersistence 
} from 'firebase/firestore';
import { FirebaseUser, FirestoreQuiz, QuizAttempt, AppNotification, ActiveQuiz, ThemeSettings, Question } from '../types';

const firebaseConfig = {
  projectId: "quizais",
  appId: "1:973110604623:web:72a04239833503e65f0b3a",
  storageBucket: "quizais.firebasestorage.app",
  apiKey: "AIzaSyCEwkmYFhQAdm0nGfaCTpS6V-GZNHdzvK4",
  authDomain: "quizais.firebaseapp.com",
  messagingSenderId: "973110604623",
  measurementId: "G-CL6STS9BYD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn("Firestore persistence failed: Multiple tabs open.");
  } else if (err.code === 'unimplemented') {
    console.warn("Firestore persistence failed: Browser not supported.");
  }
});

// AUDIT LOGGER
export const logActivity = async (
  action: string, 
  details: string, 
  userId?: string, 
  userAlias?: string
): Promise<void> => {
  try {
    const logsRef = collection(db, 'activity_logs');
    await addDoc(logsRef, {
      userId: userId || 'guest',
      userAlias: userAlias || 'Invitado',
      action,
      details,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Error writing activity log to Firestore:", err);
  }
};

export const getActivityLogs = async (): Promise<any[]> => {
  try {
    const logsRef = collection(db, 'activity_logs');
    const querySnapshot = await getDocs(logsRef);
    const logs: any[] = [];
    querySnapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() });
    });
    // Sort in memory: most recent first
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    console.error("Error fetching activity logs from Firestore:", err);
    return [];
  }
};

// AUTH FUNCTIONS
export const registerUser = async (email: string, password: string, alias: string): Promise<FirebaseUser> => {
  try {
    // 1. Create the user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Check if this is the very first user in the database
    const usersRef = collection(db, 'users');
    const firstUserQuery = dbQuery(usersRef, limit(1));
    const querySnapshot = await getDocs(firstUserQuery);
    
    // If collection is empty, role is 'admin', otherwise 'student'
    const role = querySnapshot.empty ? 'admin' : 'student';

    // Generate a short unique human-readable User ID
    const readableId = `QZ-${Math.floor(1000 + Math.random() * 9000)}`;

    const newUserProfile: FirebaseUser = {
      uid: user.uid,
      email: email.toLowerCase(),
      alias: alias.trim() || email.split('@')[0],
      readableId,
      role,
      createdAt: new Date().toISOString()
    };

    // 3. Store user details in Firestore
    await setDoc(doc(db, 'users', user.uid), newUserProfile);
    
    // Log registration activity
    await logActivity(
      'USER_REGISTER', 
      `Nuevo usuario registrado: ${newUserProfile.alias} (${email.toLowerCase()}) con ID ${readableId} y rol ${role}`, 
      user.uid, 
      newUserProfile.alias
    );

    return newUserProfile;

  } catch (error: any) {
    console.error("Error registering user:", error);
    throw error;
  }
};

export const loginUser = async (email: string, password: string): Promise<FirebaseUser> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Fetch profile from Firestore
    const userProfile = await getUserProfile(user.uid);
    if (!userProfile) {
      throw new Error("User profile not found in database.");
    }

    // Log login activity
    await logActivity(
      'USER_LOGIN', 
      `Usuario inició sesión: ${userProfile.alias} (${email.toLowerCase()})`, 
      user.uid, 
      userProfile.alias
    );

    return userProfile;
  } catch (error: any) {
    console.error("Error logging in:", error);
    throw error;
  }
};

export const logoutUser = async (): Promise<void> => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const profile = await getUserProfile(currentUser.uid);
      await logActivity(
        'USER_LOGOUT', 
        `Usuario cerró sesión: ${profile?.alias || currentUser.email}`, 
        currentUser.uid, 
        profile?.alias || 'Usuario'
      );
    } catch (e) {
      console.error(e);
    }
  }
  await signOut(auth);
};

export const getUserProfile = async (uid: string): Promise<FirebaseUser | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as FirebaseUser;
      // Self-heal: generate a readableId if it does not exist for an older account
      if (!data.readableId) {
        const readableId = `QZ-${Math.floor(1000 + Math.random() * 9000)}`;
        await updateDoc(docRef, { readableId });
        data.readableId = readableId;
      }
      return data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

// ADMIN FUNCTIONALITIES
export const getAllUsers = async (): Promise<FirebaseUser[]> => {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    const users: FirebaseUser[] = [];
    querySnapshot.forEach((doc) => {
      users.push(doc.data() as FirebaseUser);
    });
    return users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error getting all users:", error);
    throw error;
  }
};

export const updateUserRole = async (uid: string, role: 'admin' | 'student'): Promise<void> => {
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, { role });
    
    // Log role update activity
    await logActivity(
      'ROLE_UPDATED', 
      `Rol del usuario con ID ${uid} actualizado a: ${role}`, 
      auth.currentUser?.uid || 'admin-system', 
      'Admin'
    );
  } catch (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
};

// QUIZ FUNCTIONS
export const uploadQuiz = async (quiz: Omit<FirestoreQuiz, 'createdAt'>): Promise<void> => {
  try {
    const quizDoc: FirestoreQuiz = {
      ...quiz,
      completerAliases: quiz.completerAliases || [],
      createdAt: new Date().toISOString()
    };
    const sanitized = sanitizeForFirestore(quizDoc);
    await setDoc(doc(db, 'quizzes', quiz.id), sanitized);

    // Log quiz sharing activity
    await logActivity(
      'QUIZ_SHARED', 
      `Cuestionario '${quiz.name}' (${quiz.difficulty}) compartido públicamente por ${quiz.creatorAlias}`, 
      quiz.creatorUid, 
      quiz.creatorAlias
    );
  } catch (error) {
    console.error("Error uploading quiz:", error);
    throw error;
  }
};

export const getPublicQuizzes = async (): Promise<FirestoreQuiz[]> => {
  try {
    const quizzesRef = collection(db, 'quizzes');
    const q = dbQuery(quizzesRef, where('isPublic', '==', true));
    const querySnapshot = await getDocs(q);
    const quizzes: FirestoreQuiz[] = [];
    querySnapshot.forEach((doc) => {
      quizzes.push(doc.data() as FirestoreQuiz);
    });
    // Sort in memory to avoid the need for a Firestore composite index
    return quizzes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error fetching public quizzes:", error);
    throw error;
  }
};

export const deleteQuiz = async (quizId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'quizzes', quizId));

    // Log quiz deletion activity
    await logActivity(
      'QUIZ_DELETED', 
      `Cuestionario público con ID ${quizId} fue eliminado`, 
      auth.currentUser?.uid || 'admin-system', 
      'Admin'
    );
  } catch (error) {
    console.error("Error deleting quiz:", error);
    throw error;
  }
};

// PROGRESS & ATTEMPTS
export const saveQuizAttempt = async (attempt: Omit<QuizAttempt, 'id'>): Promise<QuizAttempt> => {
  try {
    const attemptsRef = collection(db, 'attempts');
    const sanitized = sanitizeForFirestore(attempt);
    const newDocRef = await addDoc(attemptsRef, sanitized);
    
    const finalAttempt: QuizAttempt = {
      ...attempt,
      id: newDocRef.id
    };
    
    // Save document ID inside the document itself
    await updateDoc(newDocRef, { id: newDocRef.id });

    // Log quiz completion activity
    await logActivity(
      'QUIZ_ATTEMPT', 
      `${attempt.userAlias} completó el cuestionario '${attempt.quizName}' obteniendo ${attempt.score}/${attempt.totalQuestions}`, 
      attempt.userUid, 
      attempt.userAlias
    );

    return finalAttempt;
  } catch (error) {
    console.error("Error saving quiz attempt:", error);
    throw error;
  }
};

export const updateQuizAttemptQuestions = async (attemptId: string, updatedQuestions: Question[]): Promise<void> => {
  try {
    const docRef = doc(db, 'attempts', attemptId);
    const sanitizedQuestions = sanitizeForFirestore(updatedQuestions);
    await updateDoc(docRef, { questions: sanitizedQuestions });
    
    // Log the update
    await logActivity(
      'QUIZ_ATTEMPT_EDITED',
      `Usuario modificó las preguntas del intento con ID ${attemptId}`,
      auth.currentUser?.uid || 'system',
      'System'
    );
  } catch (error) {
    console.error("Error updating quiz attempt questions:", error);
    throw error;
  }
};

export const getUserAttempts = async (uid: string): Promise<QuizAttempt[]> => {
  try {
    const attemptsRef = collection(db, 'attempts');
    const q = dbQuery(attemptsRef, where('userUid', '==', uid));
    const querySnapshot = await getDocs(q);
    const attempts: QuizAttempt[] = [];
    querySnapshot.forEach((doc) => {
      attempts.push(doc.data() as QuizAttempt);
    });
    return attempts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error("Error fetching user attempts:", error);
    return [];
  }
};

export const getQuizAttemptsByAllUsers = async (quizId: string): Promise<QuizAttempt[]> => {
  try {
    const attemptsRef = collection(db, 'attempts');
    const q = dbQuery(attemptsRef, where('quizId', '==', quizId));
    const querySnapshot = await getDocs(q);
    const attempts: QuizAttempt[] = [];
    querySnapshot.forEach((doc) => {
      attempts.push(doc.data() as QuizAttempt);
    });
    return attempts;
  } catch (error) {
    console.error("Error fetching quiz attempts:", error);
    return [];
  }
};

export const getAllAttempts = async (): Promise<QuizAttempt[]> => {
  try {
    const attemptsRef = collection(db, 'attempts');
    const querySnapshot = await getDocs(attemptsRef);
    const attempts: QuizAttempt[] = [];
    querySnapshot.forEach((doc) => {
      attempts.push(doc.data() as QuizAttempt);
    });
    return attempts;
  } catch (error) {
    console.error("Error fetching all attempts:", error);
    throw error;
  }
};

export const addCompleterToQuiz = async (quizId: string, alias: string): Promise<void> => {
  try {
    const quizRef = doc(db, 'quizzes', quizId);
    const quizSnap = await getDoc(quizRef);
    if (quizSnap.exists()) {
      const data = quizSnap.data() as FirestoreQuiz;
      const completers = data.completerAliases || [];
      if (!completers.includes(alias)) {
        await updateDoc(quizRef, {
          completerAliases: [...completers, alias]
        });
      }
    }
  } catch (error) {
    console.error("Error adding completer to quiz:", error);
  }
};

export const sendQuizInvitation = async (
  senderAlias: string,
  recipientIdentifier: string,
  quizId: string,
  quizName: string
): Promise<void> => {
  try {
    const trimmedId = recipientIdentifier.trim();
    const usersRef = collection(db, 'users');
    
    // Check if searched by User ID (QZ-XXXX) or Alias
    let q;
    if (trimmedId.toUpperCase().startsWith('QZ-')) {
      q = dbQuery(usersRef, where('readableId', '==', trimmedId.toUpperCase()));
    } else {
      q = dbQuery(usersRef, where('alias', '==', trimmedId));
    }
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      throw new Error("Usuario no encontrado con ese Alias o ID.");
    }
    
    const targetUser = querySnapshot.docs[0].data() as FirebaseUser;
    
    // Create the notification in Firestore
    const notificationsRef = collection(db, 'notifications');
    const newDocRef = await addDoc(notificationsRef, {
      recipientUid: targetUser.uid,
      senderAlias,
      quizId,
      quizName,
      status: 'unread',
      createdAt: new Date().toISOString()
    });
    
    // Save document ID inside the notification itself
    await updateDoc(newDocRef, { id: newDocRef.id });

    // Log quiz invitation activity
    await logActivity(
      'INVITATION_SENT', 
      `${senderAlias} envió una invitación a ${targetUser.alias} (${targetUser.email}) para jugar '${quizName}'`, 
      auth.currentUser?.uid || 'system', 
      senderAlias
    );
  } catch (error: any) {
    console.error("Error sending quiz invitation:", error);
    throw error;
  }
};

export const searchUsersByQuery = async (query: string): Promise<FirebaseUser[]> => {
  if (!query || query.trim().length < 2) return [];
  try {
    const trimmed = query.trim();
    const usersRef = collection(db, 'users');
    let results: FirebaseUser[] = [];

    if (trimmed.toUpperCase().startsWith('QZ-')) {
      // Search by exact readable ID
      const q = dbQuery(usersRef, where('readableId', '==', trimmed.toUpperCase()));
      const snap = await getDocs(q);
      snap.forEach(doc => results.push(doc.data() as FirebaseUser));
    } else {
      // Search by alias: get all users and filter client-side (Firestore doesn't support prefix search natively)
      const snap = await getDocs(usersRef);
      snap.forEach(doc => {
        const user = doc.data() as FirebaseUser;
        if (user.alias?.toLowerCase().includes(trimmed.toLowerCase())) {
          results.push(user);
        }
      });
    }
    return results.slice(0, 8); // Limit to 8 suggestions
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};

export const getUserNotifications = async (uid: string): Promise<AppNotification[]> => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = dbQuery(notificationsRef, where('recipientUid', '==', uid));
    const querySnapshot = await getDocs(q);
    const notifications: AppNotification[] = [];
    querySnapshot.forEach((doc) => {
      notifications.push(doc.data() as AppNotification);
    });
    // Sort in memory (most recent first)
    return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    return [];
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, { status: 'read' });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

export const getQuizById = async (quizId: string): Promise<FirestoreQuiz | null> => {
  try {
    const docRef = doc(db, 'quizzes', quizId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as FirestoreQuiz;
    }
    return null;
  } catch (error) {
    console.error("Error fetching quiz by ID:", error);
    return null;
  }
};

// FAVORITES
export const toggleQuizFavorite = async (
  userId: string, 
  quizId: string, 
  currentFavorites: string[] = []
): Promise<string[]> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    let updatedFavorites: string[];
    
    if (currentFavorites.includes(quizId)) {
      updatedFavorites = currentFavorites.filter(id => id !== quizId);
    } else {
      updatedFavorites = [...currentFavorites, quizId];
    }
    
    await updateDoc(userDocRef, { favoriteQuizzes: updatedFavorites });
    
    // Log favorite toggle activity
    await logActivity(
      'QUIZ_FAVORITE_TOGGLE',
      `Usuario ${userId} ${currentFavorites.includes(quizId) ? 'eliminó' : 'añadió'} el cuestionario '${quizId}' a sus favoritos`,
      userId
    );
    
    return updatedFavorites;
  } catch (error) {
    console.error("Error toggling quiz favorite:", error);
    throw error;
  }
};

// REPORTS
export const reportQuiz = async (
  quizId: string,
  quizName: string,
  reporterUid: string,
  reporterAlias: string,
  reason: string
): Promise<void> => {
  try {
    const reportsRef = collection(db, 'quiz_reports');
    const newDocRef = await addDoc(reportsRef, {
      quizId,
      quizName,
      reporterUid,
      reporterAlias,
      reason: reason.trim(),
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    await updateDoc(newDocRef, { id: newDocRef.id });

    // Notify all admins via system notifications
    const usersRef = collection(db, 'users');
    const adminQuery = query(usersRef, where('role', '==', 'admin'));
    const adminSnapshot = await getDocs(adminQuery);
    
    const notificationsRef = collection(db, 'notifications');
    for (const docSnap of adminSnapshot.docs) {
      const adminData = docSnap.data();
      const adminDocRef = await addDoc(notificationsRef, {
        recipientUid: adminData.uid,
        senderAlias: reporterAlias,
        quizId,
        quizName,
        status: 'unread',
        type: 'quiz_report',
        detailsText: reason.trim(),
        createdAt: new Date().toISOString()
      });
      await updateDoc(adminDocRef, { id: adminDocRef.id });
    }

    // Log report activity
    await logActivity(
      'QUIZ_REPORTED',
      `Cuestionario '${quizName}' (ID: ${quizId}) fue reportado por ${reporterAlias} por motivo: ${reason.substring(0, 100)}`,
      reporterUid,
      reporterAlias
    );
  } catch (error) {
    console.error("Error reporting quiz:", error);
    throw error;
  }
};

export const getQuizReports = async (): Promise<any[]> => {
  try {
    const reportsRef = collection(db, 'quiz_reports');
    const querySnapshot = await getDocs(reportsRef);
    const reports: any[] = [];
    querySnapshot.forEach((doc) => {
      reports.push({ id: doc.id, ...doc.data() });
    });
    return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error fetching quiz reports:", error);
    return [];
  }
};

export const resolveQuizReport = async (reportId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'quiz_reports', reportId);
    await updateDoc(docRef, { status: 'resolved' });

    // Log report resolution activity
    await logActivity(
      'QUIZ_REPORT_RESOLVED',
      `Reporte de cuestionario con ID ${reportId} fue marcado como RESUELTO/DESCARTADO`,
      auth.currentUser?.uid || 'admin-system',
      'Admin'
    );
  } catch (error) {
    console.error("Error resolving quiz report:", error);
    throw error;
  }
};

// QUESTION FEEDBACK (DISAGREEMENT EVALUATION)
export const submitQuestionFeedback = async (
  quizId: string,
  quizName: string,
  questionId: string,
  questionText: string,
  userUid: string,
  userAlias: string,
  evaluation: 'good' | 'bad',
  comment: string,
  creatorUid: string
): Promise<void> => {
  try {
    const feedbackRef = collection(db, 'question_feedback');
    const newDocRef = await addDoc(feedbackRef, {
      quizId,
      quizName,
      questionId,
      questionText,
      userUid,
      userAlias,
      evaluation,
      comment: comment.trim(),
      creatorUid,
      createdAt: new Date().toISOString()
    });
    await updateDoc(newDocRef, { id: newDocRef.id });

    const notificationsRef = collection(db, 'notifications');
    
    // Notify the quiz creator if they are not the feedback author
    if (creatorUid && creatorUid !== userUid) {
      const creatorDocRef = await addDoc(notificationsRef, {
        recipientUid: creatorUid,
        senderAlias: userAlias,
        quizId,
        quizName,
        status: 'unread',
        type: 'question_feedback',
        questionText,
        detailsText: comment.trim() || (evaluation === 'good' ? 'Valoración positiva' : 'Valoración negativa'),
        createdAt: new Date().toISOString()
      });
      await updateDoc(creatorDocRef, { id: creatorDocRef.id });
    }

    // Also notify all admins
    const usersRef = collection(db, 'users');
    const adminQuery = query(usersRef, where('role', '==', 'admin'));
    const adminSnapshot = await getDocs(adminQuery);
    
    for (const docSnap of adminSnapshot.docs) {
      const adminData = docSnap.data();
      if (adminData.uid !== userUid) {
        const adminDocRef = await addDoc(notificationsRef, {
          recipientUid: adminData.uid,
          senderAlias: userAlias,
          quizId,
          quizName,
          status: 'unread',
          type: 'question_feedback',
          questionText,
          detailsText: comment.trim() || (evaluation === 'good' ? 'Valoración positiva' : 'Valoración negativa'),
          createdAt: new Date().toISOString()
        });
        await updateDoc(adminDocRef, { id: adminDocRef.id });
      }
    }

    // Log feedback activity
    await logActivity(
      'QUESTION_FEEDBACK',
      `Pregunta de '${quizName}' valorada como ${evaluation.toUpperCase()} por ${userAlias}. Comentario: ${comment.substring(0, 100)}`,
      userUid,
      userAlias
    );
  } catch (error) {
    console.error("Error submitting question feedback:", error);
    throw error;
  }
};

export const getQuestionFeedback = async (): Promise<any[]> => {
  try {
    const feedbackRef = collection(db, 'question_feedback');
    const querySnapshot = await getDocs(feedbackRef);
    const feedback: any[] = [];
    querySnapshot.forEach((doc) => {
      feedback.push({ id: doc.id, ...doc.data() });
    });
    return feedback.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error fetching question feedback:", error);
    return [];
  }
};

// ACTIVE PROGRESS & PAUSED QUIZZES SYNCING
export const updateActiveQuizProgress = async (uid: string, activeQuiz: ActiveQuiz | null): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    const sanitized = activeQuiz ? sanitizeForFirestore(activeQuiz) : null;
    await updateDoc(userRef, { activeQuizProgress: sanitized });
  } catch (err) {
    console.error("Error updating active quiz progress in Firestore:", err);
  }
};

export const updatePausedQuizzesInDb = async (uid: string, pausedQuizzes: ActiveQuiz[]): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    const sanitized = pausedQuizzes.map(q => sanitizeForFirestore(q));
    await updateDoc(userRef, { pausedQuizzes: sanitized });
  } catch (err) {
    console.error("Error updating paused quizzes in Firestore:", err);
  }
};

export const updateUserThemeSettings = async (uid: string, themeSettings: ThemeSettings): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { themeSettings: sanitizeForFirestore(themeSettings) });
  } catch (err) {
    console.error("Error updating theme settings in Firestore:", err);
  }
};

export const createResumeNotification = async (
  uid: string,
  senderAlias: string,
  quizId: string,
  quizName: string,
  initialDetails: string
): Promise<string> => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const newDocRef = await addDoc(notificationsRef, {
      recipientUid: uid,
      senderAlias,
      quizId,
      quizName,
      status: 'unread',
      type: 'resume_progress',
      detailsText: initialDetails,
      createdAt: new Date().toISOString()
    });
    await updateDoc(newDocRef, { id: newDocRef.id });
    return newDocRef.id;
  } catch (error) {
    console.error("Error creating resume notification:", error);
    throw error;
  }
};

export const updateResumeNotificationDetails = async (notificationId: string, details: string): Promise<void> => {
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, { detailsText: details });
  } catch (error) {
    console.error("Error updating resume notification details in Firestore:", error);
  }
};

export const deleteNotificationFromDb = async (notificationId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting notification from Firestore:", error);
  }
};

/**
 * Recursively removes any property with a value of 'undefined' from an object/array,
 * so it is safe to write to Firestore (which throws errors on 'undefined' fields).
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as any;
  }
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = (obj as any)[key];
        if (val !== undefined) {
          sanitized[key] = sanitizeForFirestore(val);
        }
      }
    }
    return sanitized;
  }
  return obj;
}


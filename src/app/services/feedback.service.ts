import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, DocumentReference } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';

export interface Feedback {
    id?: string;
    autor: string;
    conteudo: string;
    avaliacao: number;
    data: number;
    userId: string;
}

@Injectable({
    providedIn: 'root'
})
export class FeedbackService {
    private feedbackCollection: AngularFirestoreCollection<Feedback>;
    private feedbacks: Observable<Feedback[]>;

    constructor(
        private afs: AngularFirestore,
        private afAuth: AngularFireAuth
    ) {
        this.feedbackCollection = this.afs.collection<Feedback>('feedbacks', ref => ref.orderBy('data', 'desc'));

        this.feedbacks = this.feedbackCollection.snapshotChanges().pipe(
            map(actions => {
                return actions.map(a => {
                    const data = a.payload.doc.data() as Feedback;
                    const id = a.payload.doc.id;
                    return { id, ...data };
                });
            })
        );
    }

    addFeedback(feedback: Omit<Feedback, 'userId' | 'data'>): Promise<DocumentReference> {
        return this.afAuth.authState.pipe(
            take(1),
            switchMap(user => {
                if (!user) {
                    return Promise.reject(new Error("Usuário não autenticado."));
                }

                const newFeedback: Feedback = {
                    ...feedback,
                    userId: user.uid,
                    data: Date.now()
                };
                return this.feedbackCollection.add(newFeedback);
            })
        ).toPromise() as Promise<DocumentReference>;
    }

    getFeedbacks(): Observable<Feedback[]> {
        return this.feedbacks;
    }

    getFeedback(id: string): Observable<Feedback | undefined> {
        return this.feedbackCollection.doc<Feedback>(id).valueChanges();
    }

    updateFeedback(id: string, feedback: Partial<Feedback>): Promise<void> {
        const { userId, ...updateData } = feedback;
        return this.feedbackCollection.doc(id).update(updateData);
    }

    deleteFeedback(id: string): Promise<void> {
        return this.feedbackCollection.doc(id).delete();
    }
}
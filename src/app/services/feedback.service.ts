import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, DocumentReference } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, from } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';

export interface Feedback {
    id?: string;
    autor: string;
    conteudo: string;
    avaliacao: number;
    data: number; // timestamp em milissegundos
    userId: string; // ID do usuário que criou o feedback
}

@Injectable({
    providedIn: 'root'
})
export class FeedbackService {
    private feedbackCollection: AngularFirestoreCollection<Feedback>;
    private feedbacks: Observable<Feedback[]>;

    constructor(
        private afs: AngularFirestore,
        private afAuth: AngularFireAuth // INJEÇÃO VIA CONSTRUTOR: Forma correta que evita o NG0203
    ) {
        // Ordena os feedbacks por data (o mais recente primeiro)
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

    /** Adiciona um novo feedback. Obtém o userId do usuário logado. */
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

    /**
     * Atualiza um feedback, verificando antes se o usuário logado é o autor.
     * @param id ID do documento.
     * @param feedback Dados para atualização.
     */
    updateFeedback(id: string, feedback: Partial<Feedback>): Promise<void> {
        return this.afAuth.authState.pipe(
            take(1),
            switchMap(user => {
                if (!user) {
                    return from(Promise.reject(new Error("Usuário não autenticado.")));
                }

                // Obtém o documento atual para verificar a autoria
                return from(this.feedbackCollection.doc(id).get()).pipe(
                    switchMap(doc => {
                        const existingFeedback = doc.data() as Feedback;

                        if (!existingFeedback || existingFeedback.userId !== user.uid) {
                            return from(Promise.reject(new Error("Não autorizado. Você não pode editar o feedback de outra pessoa.")));
                        }

                        // Remove 'userId' e 'data' da atualização para manter a integridade
                        const { userId, data, ...updateData } = feedback;
                        return from(this.feedbackCollection.doc(id).update(updateData));
                    })
                );
            })
        ).toPromise() as Promise<void>;
    }

    /**
     * Exclui um feedback, verificando antes se o usuário logado é o autor.
     * @param id ID do documento.
     */
    deleteFeedback(id: string): Promise<void> {
        return this.afAuth.authState.pipe(
            take(1),
            switchMap(user => {
                if (!user) {
                    return from(Promise.reject(new Error("Usuário não autenticado.")));
                }

                // Obtém o documento atual para verificar a autoria
                return from(this.feedbackCollection.doc(id).get()).pipe(
                    switchMap(doc => {
                        const existingFeedback = doc.data() as Feedback;

                        if (!existingFeedback || existingFeedback.userId !== user.uid) {
                            return from(Promise.reject(new Error("Não autorizado. Você não pode excluir o feedback de outra pessoa.")));
                        }

                        // Exclui o feedback
                        return from(this.feedbackCollection.doc(id).delete());
                    })
                );
            })
        ).toPromise() as Promise<void>;
    }
}
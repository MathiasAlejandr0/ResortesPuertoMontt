export class EncryptionKeyService {
  private keyHash: string | null = 'test-key-hash';

  async getOrCreateEncryptionKey(): Promise<Buffer> {
    // Clave estable para pruebas
    return Buffer.alloc(32, 1);
  }

  validateKey(key: Buffer): boolean {
    return key.length === 32;
  }

  getCurrentKeyHash(): string | null {
    return this.keyHash;
  }
}

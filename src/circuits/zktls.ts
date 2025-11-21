/**
 * zkTLS_snapshot circuit implementation
 * 
 * This circuit proves that attributes came from a valid TLS session
 * with the provider and match the HTTP response
 * 
 * Integrates with TLSNotary for actual proof generation
 */

import { ProviderAttributes, ZKProof } from '../types';
import { TLSNotaryProof } from '../services/tlsnotary';
import { tlsNotaryService } from '../services/tlsnotary';

/**
 * Generate zkTLS snapshot proof using TLSNotary
 * 
 * This function:
 * 1. Takes a TLSNotary proof (already generated)
 * 2. Validates the proof structure
 * 3. Extracts public inputs
 * 4. Returns proof in format expected by backend
 */
export async function generateZkTLSProof(
  tlsNotaryProof: TLSNotaryProof,
  providerId: string,
  snapshotVersion: number
): Promise<{ proof: ZKProof; publicInputs: string[] }> {
  // Verify TLSNotary proof structure
  if (!tlsNotaryProof.session || !tlsNotaryProof.response || !tlsNotaryProof.snarkProof) {
    throw new Error('Invalid TLSNotary proof structure');
  }

  // Extract public inputs from TLSNotary proof
  const domainHash = tlsNotaryProof.publicInputs[0];
  const certPubKeyHash = tlsNotaryProof.publicInputs[1];
  const commitment = tlsNotaryProof.commitment;

  // Use SNARK proof from TLSNotary
  const proof: ZKProof = {
    pi_a: tlsNotaryProof.snarkProof.pi_a,
    pi_b: tlsNotaryProof.snarkProof.pi_b,
    pi_c: tlsNotaryProof.snarkProof.pi_c,
    protocol: tlsNotaryProof.snarkProof.protocol,
    curve: tlsNotaryProof.snarkProof.curve,
  };

  const publicInputs = [
    domainHash,
    certPubKeyHash,
    commitment,
    providerId,
    snapshotVersion.toString(),
    tlsNotaryProof.response.bodyHash,
    tlsNotaryProof.session.timestamp.toString(),
  ];

  return { proof, publicInputs };
}

/**
 * Verify zkTLS snapshot proof
 * 
 * Uses TLSNotary service to verify the proof
 */
export async function verifyZkTLSProof(
  proof: ZKProof,
  publicInputs: string[]
): Promise<boolean> {
  // Extract domain from public inputs
  const domainHash = publicInputs[0];
  const expectedDomain = publicInputs[3]; // Provider domain (if included)
  
  // Reconstruct TLSNotary proof structure
  const tlsNotaryProof: TLSNotaryProof = {
    session: {
      domain: expectedDomain || 'unknown',
      certificateChain: [],
      handshakeHash: publicInputs[1] || '',
      sessionId: '',
      cipherSuite: '',
      timestamp: parseInt(publicInputs[6] || '0'),
    },
    response: {
      statusCode: 200,
      headers: {},
      body: '',
      bodyHash: publicInputs[5] || '',
    },
    snarkProof: {
      pi_a: proof.pi_a,
      pi_b: proof.pi_b,
      pi_c: proof.pi_c,
      protocol: proof.protocol,
      curve: proof.curve,
    },
    publicInputs,
    commitment: publicInputs[2] || '',
  };

  // Verify using TLSNotary service
  const result = await tlsNotaryService.verifyProof(
    tlsNotaryProof,
    expectedDomain || 'unknown'
  );

  return result.valid;
}


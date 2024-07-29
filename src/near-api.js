// import "near-api-js/dist/near-api-js.min.js";
import { getConfig } from "./near-config";
import { initFtContract } from "./FtContract";
import * as nearAPI from "near-api-js";

export const nearConfig = getConfig(process.env.MODE || "development");

export function signOutNearWallet() {
  window.walletConnection.signOut();
  // reload page
  window.location.replace(window.location.origin + window.location.pathname);
}

export function signInWithNearWallet() {
  window.walletConnection.requestSignIn(nearConfig.contractName);
}

export async function initContract() {
  const nearConfig = getConfig(process.env.NODE_ENV || "testnet");

  const near = await nearAPI.connect({
    deps: {
      keyStore: new nearAPI.keyStores.BrowserLocalStorageKeyStore(),
    },
    ...nearConfig,
  });
  const appKeyPrefix = "uniqueAppName"; 
  // Needed to access wallet
  window.walletConnection = new nearAPI.WalletConnection(near, appKeyPrefix);
  // Load in account data
  let currentUser;
  if (walletConnection.getAccountId()) {
    currentUser = {
      accountId: walletConnection.getAccountId(),
      balance: (await walletConnection.account().state()).amount,
    };
  }
  window.accountId = currentUser.accountId;
  // Initializing our contract APIs by contract name and configuration
  window.contract = await new nearAPI.Contract(walletConnection.account(), nearConfig.contractName, {
    viewMethods: [
      "list_listings_by_nft_contract_id",
      "list_allowed_nft_contract_ids",
      "list_allowed_ft_contract_ids",
      "get_listing_by_id",
      "get_rental_contract_id"
    ],
    changeMethods: ["createNewGame", "joinGame", "rollDice", "claimWinnings"],
  });

  window.rentalContractId = await getRentalContractId();
  
  window.rentalContract = await new nearAPI.Contract(
    window.walletConnection.account(),
    window.rentalContractId,
    {
      viewMethods: ["leases_by_borrower", "leases_by_owner", "lease_by_contract_and_token"],
      changeMethods: ["claim_back"],
    }
  );
}

export async function getRentalContractId() { 
  return await window.contract.get_rental_contract_id();
}


export async function getAllowedFTs() {
  const ftAddrs = await window.contract.list_allowed_ft_contract_ids({});
  const fts = await Promise.all(ftAddrs.map(async addr => {
    const contract = await initFtContract(addr);
    const ftMetadata = await contract.ft_metadata({});
    return { address: addr, ...ftMetadata };
  }));
  return fts;
}

export async function acceptLease(leaseId, rent) {
  let response = await window.contract.lending_accept({
    args: {
      lease_id: leaseId,
    },
    gas: "300000000000000",
    amount: (BigInt(rent) + BigInt(1e18)).toString(),
  });
  return response;
}

export async function listingsByNftContractId(nftContractId) {
  const listings = await window.contract.list_listings_by_nft_contract_id({
    nft_contract_id: nftContractId,
  });
  return listings;
}

export async function listAllowedNftContractIds() {
  return await window.contract.list_allowed_nft_contract_ids({})
}

export async function listingByContractIdAndTokenId(nftContractId, tokenId) {
  const listing = await window.contract.get_listing_by_id({
    listing_id: [nftContractId, tokenId],
  });
  return listing;
}

export async function myLendings() {
  return await window.rentalContract.leases_by_owner({
    account_id: window.accountId,
  });
}

export async function myBorrowings() {
  return await window.rentalContract.leases_by_borrower({
    account_id: window.accountId,
  });
}

export async function leaseByContractIdAndTokenId(nftContractId, tokenId) {
  return await window.rentalContract.lease_by_contract_and_token({
    contract_id: nftContractId,
    token_id: tokenId,
  });
}

export async function claimBack(leaseId) {
  let response = await window.rentalContract.claim_back({
    args: {
      lease_id: leaseId,
    },
    gas: "300000000000000",
    amount: 1,
  });
  return response;
}
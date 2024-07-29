import { nearConfig } from "./near-api";
import { toNormalisedAmount } from "./FtContract"
import * as nearAPI from "near-api-js";

export async function initContract(contractName) {
  return await new nearAPI.Contract(window.walletConnection.account(), contractName, {
    viewMethods: ["nft_tokens_for_owner", "nft_token", "nft_payout"],
    changeMethods: ["nft_approve"],
  });
}

export async function nftTokensForOwner(contract, accountId) {
  if (accountId == "") return [];
  let tokens = await contract.nft_tokens_for_owner({
    account_id: window.accountId,
  });
  return tokens;
}

export async function getToken(contract, tokenId) {
  if (tokenId == "") return null;
  let token = await contract.nft_token({
    token_id: tokenId,
  });
  return token;
}

export async function getPayout(contract, tokenId, balance) {
  try {
    let payouts = await contract.nft_payout({
      token_id: tokenId,
      balance: balance,
      max_len_payout: 50
    });
    return (await payouts).payout;
  } catch (e) {
    return []
  }
}

export async function newListing(
  contract,
  tokenId,
  startTsNano,
  endTsNano,
  ftAddress,
  price,
) {
  if (tokenId == "") return;
  const priceNormalised = toNormalisedAmount(ftAddress, price);
  // TODO(libo): Revist the message
  const message = JSON.stringify({
    ft_contract_id: ftAddress,
    price: priceNormalised,
    lease_start_ts_nano: startTsNano.toString(),
    lease_end_ts_nano: endTsNano.toString(),
  });
  return await contract.nft_approve({
    args: {
      token_id: tokenId,
      account_id: nearConfig.contractName,
      msg: message,
    },
    gas: "300000000000000",
    amount: "900000000000000000000",
  });
}

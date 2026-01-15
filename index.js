import { createWalletClient, custom, getContract } from "https://esm.sh/viem";
import { sepolia } from "https://esm.sh/viem/chains";

async function init() {
  const statusEl = document.getElementById("status");
  const errorEl = document.getElementById("error");

  // Check if MetaMask / window.ethereum exists
  if (typeof window.ethereum === "undefined") {
    errorEl.innerText =
      "MetaMask not detected! Please install or unlock your wallet.";
    return;
  }

  // Check if MetaMask is unlocked
  if (!window.ethereum.selectedAddress) {
    errorEl.innerText = "Please unlock your MetaMask wallet.";
    return;
  }

  // Check if MetaMask is on Sepolia
  const SEPOLIA_CHAIN_ID = "0xaa36a7"; // Sepolia

  const currentChainId = await window.ethereum.request({
    method: "eth_chainId",
  });

  if (currentChainId !== SEPOLIA_CHAIN_ID) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
      alert("Switched to Sepolia! Reload the page and try again.");
      return;
    } catch (switchError) {
      alert("Please switch MetaMask to Sepolia Testnet manually.");
      return;
    }
  }

  try {
    // Ensure MetaMask is on Sepolia
    const chainId = await window.ethereum.request({
      method: "eth_chainId",
    });
    if (chainId !== "0xaa36a7") {
      // Sepolia chainId in hex
      errorEl.innerText = "Please switch MetaMask to Sepolia Test Network.";
      return;
    }

    // Create wallet client
    const walletClient = createWalletClient({
      chain: sepolia,
      transport: custom(window.ethereum),
    });

    // Request accounts from MetaMask
    const accounts = await walletClient.requestAddresses();
    const [address] = accounts;
    statusEl.innerText = `Connected wallet: ${address}`;

    // Contract details
    const MoodContractAddress = "0x60305Bc9d50Ecd64fC19974a43249c6BDDe3FBfC";

    const MoodContractABI = [
      {
        inputs: [{ internalType: "string", name: "_mood", type: "string" }],
        name: "setMood",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [],
        name: "getMood",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
      },
    ];

    const MoodContractInstance = getContract({
      address: MoodContractAddress,
      abi: MoodContractABI,
      client: walletClient,
    });

    // Attach functions to window so buttons can call them
    window.getMood = async function () {
      try {
        const mood = await MoodContractInstance.read.getMood();
        if (!mood) {
          statusEl.innerText = "Mood is empty. Try setting a mood first!";
          return;
        }
        document.getElementById("showMood").innerText = `Your Mood: ${mood}`;
      } catch (err) {
        console.error(err);
        errorEl.innerText =
          "Error reading mood. Contract might be missing or address is wrong.";
      }
    };

    window.setMood = async function () {
      const mood = document.getElementById("mood").value.trim();
      if (!mood) {
        errorEl.innerText = "Please enter a mood before setting it!";
        return;
      }
      errorEl.innerText = "";
      statusEl.innerText = "Sending transaction… Please confirm in MetaMask.";
      try {
        await MoodContractInstance.write.setMood([mood], {
          account: address,
        });
        statusEl.innerText = "Mood updated successfully!";
      } catch (err) {
        console.error(err);
        errorEl.innerText = "Transaction failed or rejected.";
        statusEl.innerText = "";
      }
    };
  } catch (err) {
    console.error(err);
    errorEl.innerText = "An unexpected error occurred.";
  }
}

// Initialize dApp
window.addEventListener("load", init);

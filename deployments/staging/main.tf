terraform {
  backend "remote" {
    hostname     = "app.terraform.io"
    organization = "AgencyHQ"

    workspaces {
      name = "staging"
    }
  }
}

variable "ZEROTIER_API_KEY" {
  type = string
}

variable "ZEROTIER_NETWORK_ID" {
  type    = string
  default = "1d71939404bce3da"
}

resource "digitalocean_droplet" "staging" {
  image     = "docker-18-04"
  name      = "agency-staging-1"
  region    = "nyc1"
  size      = "s-1vcpu-2gb"
  ssh_keys  = [26612195]
  user_data = <<EOF
    #cloud-config
    users:
      - name: enykeev
        ssh-authorized-keys:
          - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBQXN0zdhRuD47leDskVz+GAgzNI0h3z/AhFEDAdttxz enykeev@mech.sh
        sudo: ['ALL=(ALL) NOPASSWD:ALL']
        groups: sudo, docker
        shell: /bin/bash
    write_files:
      - content: |
          ZT_API_KEY="$1"
          ZT_NET="$2"
          ZT_IP="$3"

          # basically follow this guide
          # https://www.zerotier.com/download.shtml
          curl -s 'https://raw.githubusercontent.com/zerotier/ZeroTierOne/master/doc/contact%40zerotier.com.gpg' | gpg --import && \
          if z=$(curl -s 'https://install.zerotier.com/' | gpg); then echo "$z" | sudo bash; fi

          zerotier-cli join "$ZT_NET"
          sleep 5
          NODE_ID=$(zerotier-cli info | awk '{print $3}')
          echo {\"config\":{\"authorized\":true,\"ipAssignments\":[\""$ZT_IP"\"]}} | curl -X POST -H "Authorization: Bearer $ZT_API_KEY" -d @- \
              "https://my.zerotier.com/api/network/$ZT_NET/member/$NODE_ID"

        path: /tmp/zerotier-join.sh
    runcmd:
      - sh /tmp/zerotier-join.sh ${var.ZEROTIER_API_KEY} ${var.ZEROTIER_NETWORK_ID} 192.168.200.201
  EOF
}

resource "digitalocean_firewall" "staging" {
  name = "only-22-80-and-443"

  droplet_ids = [digitalocean_droplet.staging.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["192.168.200.0/24", "90.188.115.11"]
  }

  // inbound_rule {
  //   protocol         = "tcp"
  //   port_range       = "80"
  //   source_addresses = ["0.0.0.0/0", "::/0"]
  // }

  // inbound_rule {
  //   protocol         = "tcp"
  //   port_range       = "443"
  //   source_addresses = ["0.0.0.0/0", "::/0"]
  // }

  inbound_rule {
    protocol         = "icmp"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

data "digitalocean_project" "staging" {
  name = "AgencyHQ"
}

resource "digitalocean_project_resources" "staging" {
  project = data.digitalocean_project.staging.id
  resources = [
    digitalocean_droplet.staging.urn
  ]
}
